import { Hono } from 'hono';
import { jwtMiddleware } from '../middleware/jwt.js';
import { sessionStore } from '../session-store.js';

const proxyRouter = new Hono();

// All proxy routes require a valid JWT
proxyRouter.use('*', jwtMiddleware);

/**
 * POST /proxy
 * Header: Authorization: Bearer <token>
 *
 * Body: { endpoint: string, params: Record<string, unknown> }
 *
 * Forwards a JSON-RPC call to the user's Odoo instance using
 * their server-side session cookie, then returns the raw response.
 *
 * The client builds exactly the same request body it would have
 * sent to Odoo directly — this route just adds the cookie and
 * handles the server-to-server hop.
 */
proxyRouter.post('/', async (c) => {
    const jti = c.get('jti');
    const session = sessionStore.get(jti);

    if (!session) {
        // This shouldn't happen because jwtMiddleware already checked,
        // but guard defensively.
        return c.json({ error: 'Session expired. Please log in again.' }, 401);
    }

    let body: { endpoint?: string; params?: Record<string, unknown> };
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { endpoint, params } = body;
    if (!endpoint || typeof endpoint !== 'string') {
        return c.json({ error: '"endpoint" is required (e.g. "/web/dataset/call_kw")' }, 400);
    }

    const odooUrl = `${session.odooUrl}${endpoint}`;

    const rpcBody = {
        jsonrpc: '2.0',
        method: 'call',
        id: Date.now(),
        params: params ?? {},
    };

    let odooResponse: Response;
    try {
        odooResponse = await fetch(odooUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: session.odooCookieValue,
            },
            body: JSON.stringify(rpcBody),
        });
    } catch (err) {
        return c.json({ error: `Failed to reach Odoo: ${String(err)}` }, 502);
    }

    // Refresh the session cookie if Odoo rotated it
    const setCookie = odooResponse.headers.get('set-cookie');
    if (setCookie) {
        const match = setCookie.match(/session_id=([^;]+)/);
        if (match?.[1]) {
            const updated = sessionStore.get(jti);
            if (updated) {
                updated.odooCookieValue = `session_id=${match[1]}`;
                sessionStore.set(jti, updated);
            }
        }
    }

    // Stream the Odoo response body back to the client as-is
    const responseBody = await odooResponse.text();

    return c.text(responseBody, odooResponse.status as 200, {
        'Content-Type': 'application/json',
    });
});

export { proxyRouter };
