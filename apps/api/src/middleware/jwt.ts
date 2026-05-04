import { randomUUID } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
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
 * Reads the Bearer token from the Authorization header (Bearer scheme only),
 * verifies the signature, looks up the session in the store, and
 * exposes `jti` + `uid` via Hono context variables.
 */
export const jwtMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }
    const token = authHeader.slice(7);

    let payload: JwtPayload;
    try {
        payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    } catch {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const session = await sessionStore.get(payload.jti);
    if (!session) {
        return c.json({ error: 'Session not found or expired. Please log in again.' }, 401);
    }

    c.set('jti', payload.jti);
    c.set('uid', payload.uid);

    await next();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

export function signToken(uid: number): { token: string; jti: string } {
    const jti = randomUUID();
    const token = jwt.sign({ jti, uid }, config.JWT_SECRET, { expiresIn: config.JWT_TTL });
    return { token, jti };
}
