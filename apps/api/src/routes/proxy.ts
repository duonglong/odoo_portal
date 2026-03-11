import { Hono } from 'hono';
import { jwtMiddleware } from '../middleware/jwt.js';
import { sessionStore } from '../session-store.js';

const proxyRouter = new Hono();

// All proxy routes require a valid JWT
proxyRouter.use('*', jwtMiddleware);

/**
 * POST /proxy/jsonrpc
 * Header: Authorization: Bearer <token>
 *
 * Body: {
 *   model: string,
 *   method: string,
 *   args?: unknown[],
 *   kwargs?: Record<string, unknown>
 * }
 *
 * Forwards a generic Odoo call to the stateless External API (/jsonrpc).
 * The proxy injects the user's `uid` and `password` (API Key) from the
 * server-side store so the frontend never sees them.
 */
proxyRouter.post('/jsonrpc', async (c) => {
    const jti = c.get('jti');
    const session = sessionStore.get(jti);

    if (!session) {
        return c.json({ error: 'Session expired. Please log in again.' }, 401);
    }

    let body: {
        model?: string;
        method?: string;
        args?: unknown[];
        kwargs?: Record<string, unknown>;
    };
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { model, method, args = [], kwargs = {} } = body;

    if (!model || !method) {
        return c.json({ error: 'model and method are required' }, 400);
    }

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
        console.log(`[PROXY] Fetching stateless: ${odooUrl} (Model: ${model}, Method: ${method})`);
        odooResponse = await fetch(odooUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(rpcBody),
        });
    } catch (err) {
        return c.json({ error: `Failed to reach Odoo: ${String(err)}` }, 502);
    }

    // Stream the Odoo response body back to the client, but sanitize it first
    let responseBody = await odooResponse.text();
    try {
        const json = JSON.parse(responseBody);
        // Odoo XML-RPC errors often echo back the arguments passed. 
        // We must prevent our proxy-injected password from leaking to the frontend.
        if (json.error?.data?.arguments && Array.isArray(json.error.data.arguments)) {
            json.error.data.arguments = json.error.data.arguments.map((arg: any) =>
                arg === session.password ? '***SANITIZED***' : arg
            );
            responseBody = JSON.stringify(json);
        }
    } catch {
        // Ignore parsing errors, return raw text
    }

    return c.text(responseBody, odooResponse.status as 200, {
        'Content-Type': 'application/json',
    });
});

export { proxyRouter };
