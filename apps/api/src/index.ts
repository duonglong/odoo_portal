import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { authRouter } from './routes/auth.js';
import { proxyRouter } from './routes/proxy.js';

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', corsMiddleware);

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

app.route('/auth', authRouter);
app.route('/proxy', proxyRouter);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ── Start server ──────────────────────────────────────────────────────────────
if (!process.env['JWT_SECRET']) {
    console.error('FATAL: JWT_SECRET environment variable is required but missing.');
    process.exit(1);
}

const port = parseInt(process.env['PORT'] ?? '3001', 10);

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🚀 Odoo Portal BFF proxy running on http://localhost:${info.port}`);
    console.log(`   Health:  GET  http://localhost:${info.port}/health`);
    console.log(`   Login:   POST http://localhost:${info.port}/auth/login`);
    console.log(`   Proxy:   POST http://localhost:${info.port}/proxy/<odoo-path>`);
});

export { app };
