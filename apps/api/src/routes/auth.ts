import { Hono } from 'hono';
import { sessionStore } from '../session-store.js';
import { signToken, jtiFromToken } from '../middleware/jwt.js';

const authRouter = new Hono();

/**
 * POST /auth/login
 *
 * Body: { url: string, database: string, login: string, password: string }
 *
 * Authenticates against Odoo, stores the session cookie server-side,
 * and returns a signed JWT to the client.
 */
authRouter.post('/login', async (c) => {
    let body: { url?: string; database?: string; login?: string; password?: string };
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { url, database, login, password } = body;
    if (!url || !database || !login || !password) {
        return c.json({ error: 'url, database, login, and password are required' }, 400);
    }

    // Call Odoo authenticate endpoint
    const odooEndpoint = `${url.replace(/\/$/, '')}/web/session/authenticate`;
    let odooResponse: Response;
    try {
        odooResponse = await fetch(odooEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: 1,
                params: { db: database, login, password },
            }),
        });
    } catch (err) {
        return c.json({ error: `Cannot reach Odoo at ${url}: ${String(err)}` }, 502);
    }

    if (!odooResponse.ok) {
        return c.json({ error: `Odoo returned HTTP ${odooResponse.status}` }, 502);
    }

    const odooJson = (await odooResponse.json()) as {
        result?: { uid?: number; session_id?: string; name?: string; username?: string; partner_id?: number; company_id?: number; user_context?: Record<string, unknown>; server_version?: string };
        error?: { message: string };
    };

    if (odooJson.error) {
        return c.json({ error: odooJson.error.message }, 401);
    }

    const result = odooJson.result;
    if (!result?.uid) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Extract the session cookie Odoo set
    const setCookie = odooResponse.headers.get('set-cookie') ?? '';
    const sessionMatch = setCookie.match(/session_id=([^;]+)/);
    const odooCookieValue = sessionMatch
        ? `session_id=${sessionMatch[1]}`
        : `session_id=${result.session_id ?? ''}`;

    // Issue our own JWT
    const token = signToken(result.uid);

    // Decode jti to store session (avoid re-verifying what we just signed)
    const jti = jtiFromToken(token)!;
    const ttl = parseInt(process.env['JWT_TTL'] ?? '28800', 10);

    sessionStore.set(jti, {
        odooCookieValue,
        odooUrl: url.replace(/\/$/, ''),
        database,
        uid: result.uid,
        expiresAt: Date.now() + ttl * 1000,
    });

    return c.json({
        token,
        session: {
            uid: result.uid,
            name: result.name,
            username: result.username,
            partnerId: result.partner_id,
            companyId: result.company_id,
            userContext: result.user_context,
            serverVersion: result.server_version,
            isAuthenticated: true,
        },
    });
});

/**
 * POST /auth/logout
 * Header: Authorization: Bearer <token>
 *
 * Destroys the Odoo session server-side and removes it from the store.
 */
authRouter.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const jti = jtiFromToken(token);

    if (jti) {
        const session = sessionStore.get(jti);
        if (session) {
            // Best-effort call to Odoo to destroy the session
            try {
                await fetch(`${session.odooUrl}/web/session/destroy`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: session.odooCookieValue,
                    },
                    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: {} }),
                });
            } catch {
                // Ignore — session may already be gone
            }
            sessionStore.delete(jti);
        }
    }

    return c.json({ ok: true });
});

export { authRouter };
