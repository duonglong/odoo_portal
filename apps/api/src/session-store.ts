import { config } from './config.js';

export interface StoredSession {
    password:  string;
    odooUrl:   string;
    database:  string;
    login:     string;
    uid:       number;
    expiresAt: number;
}

export interface ISessionStore {
    get(jti: string): Promise<StoredSession | undefined>;
    set(jti: string, session: StoredSession): Promise<void>;
    delete(jti: string): Promise<void>;
}

// ── In-memory implementation (default) ───────────────────────────────────────

class MemorySessionStore implements ISessionStore {
    private store = new Map<string, StoredSession>();

    async get(jti: string): Promise<StoredSession | undefined> {
        const session = this.store.get(jti);
        if (!session) return undefined;
        if (Date.now() > session.expiresAt) {
            this.store.delete(jti);
            return undefined;
        }
        return session;
    }

    async set(jti: string, session: StoredSession): Promise<void> {
        this.store.set(jti, session);
    }

    async delete(jti: string): Promise<void> {
        this.store.delete(jti);
    }

    purgeExpired(): void {
        const now = Date.now();
        for (const [jti, session] of this.store) {
            if (now > session.expiresAt) this.store.delete(jti);
        }
    }
}

// ── Session store singleton ───────────────────────────────────────────────────

/**
 * NOTE: Sessions are stored in-memory by default. All sessions are lost on
 * process restart. Set SESSION_STORE_TYPE=redis and REDIS_URL to persist
 * sessions across restarts and across multiple BFF instances.
 */
const _memory = new MemorySessionStore();
let _store: ISessionStore = _memory;

// Purge expired memory sessions every 15 minutes
setInterval(() => _memory.purgeExpired(), 15 * 60 * 1000).unref();

export const sessionStore: ISessionStore = {
    get: (jti) => _store.get(jti),
    set: (jti, s) => _store.set(jti, s),
    delete: (jti) => _store.delete(jti),
};

export async function initSessionStore(): Promise<void> {
    if (config.SESSION_STORE_TYPE !== 'redis') return;

    if (!config.REDIS_URL) {
        console.error('FATAL: REDIS_URL is required when SESSION_STORE_TYPE=redis');
        process.exit(1);
    }

    const { RedisSessionStore } = await import('./session-store-redis.js');
    const redisStore = new RedisSessionStore(config.REDIS_URL);
    await redisStore.connect();
    _store = redisStore;
}
