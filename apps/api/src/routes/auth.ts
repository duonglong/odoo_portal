import { Hono } from 'hono';
import { sessionStore } from '../session-store.js';
import { signToken, jtiFromToken } from '../middleware/jwt.js';

const authRouter = new Hono();

/**
 * POST /auth/login
 *
 * Body: { url: string, database: string, login: string, password: string }
 *
 * Authenticates against Odoo's stateless External API (/jsonrpc)
 * and returns a signed JWT to the client while storing credentials 
 * server-side for proxying.
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

    const odooUrl = url.replace(/\/$/, '');
    const odooEndpoint = `${odooUrl}/jsonrpc`;

    // 1. Call Odoo `common.authenticate`
    let authResponse: Response;
    try {
        authResponse = await fetch(odooEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: crypto.randomUUID(),
                params: {
                    service: 'common',
                    method: 'authenticate',
                    args: [database, login, password, {}],
                },
            }),
        });
    } catch (err) {
        return c.json({ error: `Cannot reach Odoo at ${url}: ${String(err)}` }, 502);
    }

    if (!authResponse.ok) {
        return c.json({ error: `Odoo returned HTTP ${authResponse.status}` }, 502);
    }

    const authJson = (await authResponse.json()) as {
        result?: number | false; // uid or false
        error?: { message: string };
    };

    if (authJson.error) {
        return c.json({ error: authJson.error.message }, 401);
    }

    const uid = authJson.result;
    if (typeof uid !== 'number' || !uid) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 2. Fetch session details via `object.execute_kw` to build the full session info
    let readResponse: Response;
    try {
        readResponse = await fetch(odooEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: crypto.randomUUID(),
                params: {
                    service: 'object',
                    method: 'execute_kw',
                    args: [
                        database,
                        uid,
                        password,
                        'res.users',
                        'search_read',
                        [[['id', '=', uid]]],
                        {
                            fields: ['name', 'login', 'partner_id', 'company_id', 'tz', 'lang'],
                            limit: 1,
                        }
                    ],
                },
            }),
        });
    } catch (err) {
        return c.json({ error: `Failed reading user details: ${String(err)}` }, 502);
    }

    const readJson = (await readResponse.json()) as {
        result?: Array<{
            name: string;
            login: string;
            partner_id?: [number, string] | false;
            company_id?: [number, string] | false;
            tz?: string | false;
            lang?: string | false;
        }>;
    };

    const user = readJson.result?.[0];

    // Issue our own JWT
    const token = signToken(uid);

    // Decode jti to store session (avoid re-verifying what we just signed)
    const jti = jtiFromToken(token)!;
    const ttl = parseInt(process.env['JWT_TTL'] ?? '28800', 10);

    sessionStore.set(jti, {
        password,
        odooUrl,
        database,
        login,
        uid,
        expiresAt: Date.now() + ttl * 1000,
    });

    return c.json({
        token,
        session: {
            uid,
            name: user?.name ?? login,
            username: user?.login ?? login,
            partnerId: Array.isArray(user?.partner_id) ? user.partner_id[0] : 0,
            companyId: Array.isArray(user?.company_id) ? user.company_id[0] : 0,
            userContext: {
                lang: user?.lang || 'en_US',
                tz: user?.tz || 'UTC',
                uid,
            },
            serverVersion: 'unknown (jsonrpc)', // External API doesn't expose version on login directly
            isAuthenticated: true,
        },
    });
});

/**
 * POST /auth/logout
 * Header: Authorization: Bearer <token>
 *
 * Scraps the session from the BFF store.
 * Because we use stateless JSON-RPC, there is no Odoo session to destroy.
 */
authRouter.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const jti = jtiFromToken(token);

    if (jti) {
        sessionStore.delete(jti);
    }

    return c.json({ ok: true });
});

export { authRouter };
