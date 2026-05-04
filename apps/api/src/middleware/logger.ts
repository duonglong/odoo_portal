import { createMiddleware } from 'hono/factory';
import { config } from '../config.js';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LEVELS[number];

export function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVELS.indexOf(level) < LEVELS.indexOf(config.LOG_LEVEL)) return;
    const entry = JSON.stringify({ level, msg, ...data, ts: new Date().toISOString() });
    if (level === 'error' || level === 'warn') {
        console.error(entry);
    } else {
        console.log(entry);
    }
}

export const requestLogger = createMiddleware(async (c, next) => {
    const start = Date.now();
    await next();
    log('info', 'request', {
        method: c.req.method,
        path:   c.req.path,
        status: c.res.status,
        ms:     Date.now() - start,
    });
});
