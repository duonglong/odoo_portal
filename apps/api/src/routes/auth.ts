import { Hono } from 'hono';
import { config } from '../config.js';
import { log } from '../middleware/logger.js';
import { sessionStore } from '../session-store.js';
import { signToken, jwtMiddleware } from '../middleware/jwt.js';

const authRouter = new Hono();

// ── Login rate limiter ────────────────────────────────────────────────────────
// Sliding-window counter keyed on client IP. Single-process only.
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// Purge stale entries so the Map does not grow without bound under rotating IPs
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of loginAttempts) {
        if (now > entry.resetAt) loginAttempts.delete(ip);
    }
}, 15 * 60 * 1000).unref();

function checkLoginRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
        return true;
    }
    if (entry.count >= LOGIN_MAX_ATTEMPTS) return false;
    entry.count++;
    return true;
}

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
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    if (!checkLoginRateLimit(ip)) {
        log('warn', 'auth.rate_limited', { ip });
        return c.json({ error: 'Too many login attempts. Please try again later.' }, 429);
    }

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
            signal: AbortSignal.timeout(15_000),
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
        log('warn', 'auth.invalid_credentials', { ip, login, odooUrl });
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 2. Fetch session details and server version in parallel
    const [readResult, versionResult] = await Promise.allSettled([
        fetch(odooEndpoint, {
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
                        },
                    ],
                },
            }),
            signal: AbortSignal.timeout(10_000),
        }),
        fetch(odooEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: crypto.randomUUID(),
                params: { service: 'common', method: 'version', args: [] },
            }),
            signal: AbortSignal.timeout(5_000),
        }),
    ]);

    const readJson = readResult.status === 'fulfilled'
        ? ((await readResult.value.json()) as {
            result?: Array<{
                name: string;
                login: string;
                partner_id?: [number, string] | false;
                company_id?: [number, string] | false;
                tz?: string | false;
                lang?: string | false;
            }>;
          })
        : undefined;
    const user = readJson?.result?.[0];

    const versionJson = versionResult.status === 'fulfilled'
        ? ((await versionResult.value.json()) as { result?: { server_version?: string } })
        : undefined;
    const serverVersion: string = versionJson?.result?.server_version ?? 'unknown';

    // Issue our own JWT
    const { token, jti } = signToken(uid);
    const ttl = config.JWT_TTL;

    await sessionStore.set(jti, {
        password,
        odooUrl,
        database,
        login,
        uid,
        expiresAt: Date.now() + ttl * 1000,
    });

    log('info', 'auth.login_success', { uid, login, odooUrl });

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
            serverVersion,
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
 * Requires a valid JWT so a forged token cannot drop arbitrary sessions.
 */
authRouter.post('/logout', jwtMiddleware, async (c) => {
    const jti = c.get('jti');
    await sessionStore.delete(jti);
    return c.json({ ok: true });
});

export { authRouter };
