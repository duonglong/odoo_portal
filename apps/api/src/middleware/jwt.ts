import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { sessionStore } from '../session-store.js';

export interface JwtPayload {
    jti: string;
    uid: number;
    iat: number;
    exp: number;
}

declare module 'hono' {
    interface ContextVariableMap {
        jti: string;
        uid: number;
    }
}

/**
 * JWT authentication middleware.
 *
 * Reads the Bearer token from the Authorization header,
 * verifies it, looks up the session in the store, and
 * exposes `jti` + `uid` via Hono context variables.
 */
export const jwtMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');

    let token: string;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (queryToken) {
        token = queryToken;
    } else {
        return c.json({ error: 'Missing or invalid Authorization header or token query parameter' }, 401);
    }
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
        return c.json({ error: 'Server misconfiguration: JWT_SECRET not set' }, 500);
    }

    let payload: JwtPayload;
    try {
        payload = jwt.verify(token, secret) as JwtPayload;
    } catch {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const session = sessionStore.get(payload.jti);
    if (!session) {
        return c.json({ error: 'Session not found or expired. Please log in again.' }, 401);
    }

    c.set('jti', payload.jti);
    c.set('uid', payload.uid);

    await next();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

let _tokenCounter = 0;

export function signToken(uid: number): string {
    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new Error('JWT_SECRET is not configured');

    const ttl = parseInt(process.env['JWT_TTL'] ?? '28800', 10);
    const jti = `${Date.now()}-${++_tokenCounter}`;

    return jwt.sign({ jti, uid }, secret, { expiresIn: ttl });
}

export function jtiFromToken(token: string): string | null {
    const secret = process.env['JWT_SECRET'];
    if (!secret) return null;
    try {
        const payload = jwt.decode(token) as JwtPayload | null;
        return payload?.jti ?? null;
    } catch {
        return null;
    }
}
