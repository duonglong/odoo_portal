import { Hono } from 'hono';
import { jwtMiddleware } from '../middleware/jwt.js';
import { sessionStore } from '../session-store.js';

const proxyRouter = new Hono();

// All proxy routes require a valid JWT
proxyRouter.use('*', jwtMiddleware);

/**
 * POST /proxy/jsonrpc/:model/:method
 * Header: Authorization: Bearer <token>
 *
 * Body: {
 *   args?: unknown[],
 *   kwargs?: Record<string, unknown>
 * }
 *
 * Forwards a generic Odoo call to the stateless External API (/jsonrpc).
 * The proxy injects the user's `uid` and `password` (API Key) from the
 * server-side store so the frontend never sees them.
 * Model and method are encoded in the URL path for informative access logs.
 */
proxyRouter.post('/jsonrpc/:model/:method', async (c) => {
    const jti = c.get('jti');
    const session = await sessionStore.get(jti);

    if (!session) {
        return c.json({ error: 'Session expired. Please log in again.' }, 401);
    }

    const model = c.req.param('model');
    const method = c.req.param('method');

    let body: {
        args?: unknown[];
        kwargs?: Record<string, unknown>;
    };
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { args = [], kwargs = {} } = body;

    const odooUrl = `${session.odooUrl}/jsonrpc`;

    const rpcBody = {
        jsonrpc: '2.0',
        method: 'call',
        id: crypto.randomUUID(),
        params: {
            service: 'object',
            method: 'execute_kw',
            args: [
                session.database,
                session.uid,
                session.password, // Injected securely by proxy
                model,
                method,
                args,
                kwargs,
            ],
        },
    };

    let odooResponse: Response;
    try {
        odooResponse = await fetch(odooUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(rpcBody),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        return c.json({ error: `Failed to reach Odoo: ${String(err)}` }, 502);
    }

    // Stream the Odoo response body back to the client as-is
    const responseBody = await odooResponse.text();

    return c.text(responseBody, odooResponse.status as 200, {
        'Content-Type': 'application/json',
    });
});



export { proxyRouter };
