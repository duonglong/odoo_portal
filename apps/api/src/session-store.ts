/**
 * In-memory session store.
 *
 * Maps a JWT id (jti) → the Odoo session cookie string for that user.
 * Swap for a Redis-backed store in multi-instance deployments.
 */

export interface StoredSession {
    /** Raw `session_id=xxx` cookie value to send to Odoo */
    odooCookieValue: string;
    /** The Odoo instance URL this session belongs to */
    odooUrl: string;
    /** Odoo database */
    database: string;
    /** Odoo uid */
    uid: number;
    /** When this entry expires (epoch ms) */
    expiresAt: number;
}

class SessionStore {
    private store = new Map<string, StoredSession>();

    set(jti: string, session: StoredSession): void {
        this.store.set(jti, session);
    }

    get(jti: string): StoredSession | undefined {
        const session = this.store.get(jti);
        if (!session) return undefined;
        if (Date.now() > session.expiresAt) {
            this.store.delete(jti);
            return undefined;
        }
        return session;
    }

    delete(jti: string): void {
        this.store.delete(jti);
    }

    /** Periodically remove expired sessions */
    purgeExpired(): void {
        const now = Date.now();
        for (const [jti, session] of this.store) {
            if (now > session.expiresAt) this.store.delete(jti);
        }
    }
}

export const sessionStore = new SessionStore();

// Purge expired sessions every 15 minutes
setInterval(() => sessionStore.purgeExpired(), 15 * 60 * 1000);
