import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
    NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
    PORT:                z.coerce.number().int().min(1).max(65535).default(3001),
    JWT_SECRET:          z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_TTL:             z.coerce.number().int().positive().default(28800),
    PORTAL_ORIGINS:      z.string().default('http://localhost:8081'),
    LOG_LEVEL:           z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SESSION_STORE_TYPE:  z.enum(['memory', 'redis']).default('memory'),
    REDIS_URL:           z.string().url().optional(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
    console.error('Invalid configuration — fix the following environment variables:');
    for (const [field, errors] of Object.entries(result.error.flatten().fieldErrors)) {
        console.error(`  ${field}: ${errors?.join(', ')}`);
    }
    process.exit(1);
}

if (
    result.data.NODE_ENV === 'production' &&
    result.data.JWT_SECRET === 'change-me-to-a-random-64-char-string'
) {
    console.error('FATAL: JWT_SECRET must be changed from the default value in production.');
    process.exit(1);
}

export const config = result.data;
