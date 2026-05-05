import { config } from './config.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { corsMiddleware } from './middleware/cors.js';
import { requestLogger, log } from './middleware/logger.js';
import { initSessionStore } from './session-store.js';
import { authRouter } from './routes/auth.js';
import { proxyRouter } from './routes/proxy.js';

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', corsMiddleware);
app.use('*', requestLogger);

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

app.route('/auth', authRouter);

// Cap proxy request bodies at 1 MB to prevent memory exhaustion
app.use('/proxy/*', bodyLimit({ maxSize: 1 * 1024 * 1024 }));
app.route('/proxy', proxyRouter);

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
    log('error', 'unhandled_error', { message: err.message, stack: err.stack });
    return c.json({ error: { message: err.message ?? 'Internal server error' } }, 500);
});

// ── Process-level error handlers ─────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    log('error', 'uncaught_exception', { message: err.message, stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    log('error', 'unhandled_rejection', {
        message: reason instanceof Error ? reason.message : String(reason),
    });
});

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ── Start server ──────────────────────────────────────────────────────────────
await initSessionStore();

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`🚀 Odoo Portal BFF proxy running on http://localhost:${info.port}`);
    console.log(`   Health:  GET  http://localhost:${info.port}/health`);
    console.log(`   Login:   POST http://localhost:${info.port}/auth/login`);
    console.log(`   Proxy:   POST http://localhost:${info.port}/proxy/<odoo-path>`);
});

export { app };
