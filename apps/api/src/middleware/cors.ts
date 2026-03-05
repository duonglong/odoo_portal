import { createMiddleware } from 'hono/factory';

/**
 * CORS middleware.
 *
 * Reads allowed origins from the PORTAL_ORIGINS env var
 * (comma-separated list, e.g. "http://localhost:8081,https://portal.example.com").
 *
 * For preflight OPTIONS requests, responds immediately with 204.
 */
export const corsMiddleware = createMiddleware(async (c, next) => {
    const rawOrigins = process.env['PORTAL_ORIGINS'] ?? 'http://localhost:8081';
    const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

    const requestOrigin = c.req.header('Origin') ?? '';
    const allowed = allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*');
    const responseOrigin = allowed ? requestOrigin : allowedOrigins[0] ?? '';

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
