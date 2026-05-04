import { createClient } from 'redis';
import type { ISessionStore, StoredSession } from './session-store.js';
import { log } from './middleware/logger.js';

export class RedisSessionStore implements ISessionStore {
    private client: ReturnType<typeof createClient>;
    private prefix = 'bff:session:';

    constructor(redisUrl: string) {
        this.client = createClient({ url: redisUrl });
        this.client.on('error', (err: Error) =>
            log('error', 'redis.client_error', { message: err.message }),
        );
    }

    async connect(): Promise<void> {
        await this.client.connect();
        log('info', 'redis.connected');
    }

    async get(jti: string): Promise<StoredSession | undefined> {
        const raw = await this.client.get(this.prefix + jti);
        if (!raw) return undefined;
        const session = JSON.parse(raw) as StoredSession;
        if (Date.now() > session.expiresAt) {
            await this.client.del(this.prefix + jti);
            return undefined;
        }
        return session;
    }

    async set(jti: string, session: StoredSession): Promise<void> {
        const ttlMs = session.expiresAt - Date.now();
        if (ttlMs <= 0) return;
        await this.client.set(this.prefix + jti, JSON.stringify(session), { PX: ttlMs });
    }

    async delete(jti: string): Promise<void> {
        await this.client.del(this.prefix + jti);
    }
}
