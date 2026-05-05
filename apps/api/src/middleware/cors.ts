import { createMiddleware } from 'hono/factory';
import { config } from '../config.js';

// Parse once at module load — PORTAL_ORIGINS never changes at runtime.
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
    config.PORTAL_ORIGINS
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
);
const FALLBACK_ORIGIN = [...ALLOWED_ORIGINS][0] ?? '';

/**
 * CORS middleware.
 *
 * Reads allowed origins from the PORTAL_ORIGINS env var
 * (comma-separated list, e.g. "http://localhost:8081,https://portal.example.com").
 *
 * For preflight OPTIONS requests, responds immediately with 204.
 */
export const corsMiddleware = createMiddleware(async (c, next) => {
    const requestOrigin = c.req.header('Origin') ?? '';
    const allowed = ALLOWED_ORIGINS.has(requestOrigin) || ALLOWED_ORIGINS.has('*');
    const responseOrigin = allowed ? requestOrigin : FALLBACK_ORIGIN;

    c.header('Access-Control-Allow-Origin', responseOrigin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Vary', 'Origin');

    // Handle preflight
    if (c.req.method === 'OPTIONS') {
        return c.body(null, 204);
    }

    await next();
});
