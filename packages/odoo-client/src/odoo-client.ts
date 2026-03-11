import type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
} from './types/connection.js';
import type { OdooDomain, SearchOptions } from './types/domain.js';
import type { AuthenticateResult } from './types/rpc.js';


import { ApiTransport } from './api-transport.js';
import type { SessionStorage } from './session-storage.js';
import { InMemorySessionStorage } from './session-storage.js';
import { AuthenticationError, SessionExpiredError } from './errors.js';

export interface OdooClientOptions {
    /** Session storage implementation (defaults to in-memory) */
    sessionStorage?: SessionStorage;
    /** Storage key prefix for multi-instance support */
    storageKey?: string;
    /**
     * Custom transport. Defaults to ApiTransport pointing to config.url if not provided.
     */
    transport?: ApiTransport;
}

/**
 * Odoo JSON-RPC client — connects to any Odoo instance dynamically.
 *
 * Usage:
 *   const client = new OdooClient({ url: 'https://my.odoo.com', database: 'prod' });
 *   await client.authenticate({ login: 'user@co.com', password: 'api-key' });
 *   const orders = await client.searchRead('sale.order', [], ['name', 'amount_total']);
 */
export class OdooClient {
    private transport: ApiTransport;
    private session: OdooSession | null = null;
    private sessionStorage: SessionStorage;
    private storageKey: string;
    private config: OdooConnectionConfig;

    constructor(
        config: OdooConnectionConfig,
        options: OdooClientOptions = {},
    ) {
        this.config = config;
        this.transport = options.transport ?? new ApiTransport(config.url);
        this.sessionStorage = options.sessionStorage ?? new InMemorySessionStorage();
        this.storageKey = options.storageKey ?? `odoo_session_${config.url}_${config.database}`;
    }

    // ──────────────────────────────────────────
    // Authentication
    // ──────────────────────────────────────────

    /**
     * Authenticate with the Odoo instance.
     * Supports both password and API key (Odoo 19).
     */
    async authenticate(credentials: AuthCredentials): Promise<OdooSession> {
        // Authentication is always routed through the BFF proxy (ApiTransport).
        // Token is returned alongside session from the proxy
        const { session: proxySession, token } = await this.transport.login({
            url: this.config.url,
            database: this.config.database,
            login: credentials.login,
            password: credentials.password,
        });

        this.session = {
            sessionId: '',          // session is held server-side
            proxyJwt: token,        // Save proxy token so it persists
            uid: proxySession.uid,
            username: proxySession.username,
            name: proxySession.name,
            partnerId: proxySession.partnerId,
            companyId: proxySession.companyId,
            userContext: proxySession.userContext,
            serverVersion: proxySession.serverVersion,
            isAuthenticated: true,
        };
        await this.sessionStorage.save(this.storageKey, this.session);
        return this.session;
    }

    /**
     * Restore a previously saved session.
     * Returns null if no session is stored or if the session is invalid.
     */
    async restoreSession(): Promise<OdooSession | null> {
        const saved = await this.sessionStorage.load(this.storageKey);
        if (!saved) return null;

        this.session = saved;

        if (!this.session) {
            return null;
        }

        // Wire up the JWT for the ApiTransport
        if (!this.session.proxyJwt) {
            // If we don't have a JWT saved, we can't make proxy calls
            await this.clearSession();
            return null;
        }
        this.transport.setJwt(this.session.proxyJwt);

        // Validate the session is still alive by making a lightweight read request
        try {
            const info = await this.transport.call<unknown[]>(
                'res.users',
                'read',
                [[this.session.uid], ['id']],
            );

            if (!info || info.length === 0) {
                await this.clearSession();
                return null;
            }

            return this.session;
        } catch {
            await this.clearSession();
            return null;
        }
    }

    /** Destroy the current session */
    async logout(): Promise<void> {
        if (this.session) {
            try {
                await this.transport.logout();
            } catch {
                // Ignore errors during logout
            }
        }
        await this.clearSession();
    }

    /** Check if currently authenticated */
    isAuthenticated(): boolean {
        return this.session !== null && this.session.isAuthenticated;
    }

    /** Get the current session (null if not authenticated) */
    getSession(): OdooSession | null {
        return this.session;
    }

    /** Get the connection config */
    getConfig(): OdooConnectionConfig {
        return this.config;
    }

    // ──────────────────────────────────────────
    // CRUD Operations
    // ──────────────────────────────────────────

    /**
     * Search and read records in a single call.
     * Most efficient way to fetch data from Odoo.
     */
    async searchRead<T = Record<string, unknown>>(
        model: string,
        domain: OdooDomain = [],
        fields: string[] = [],
        options: SearchOptions = {},
    ): Promise<T[]> {
        this.assertAuthenticated();

        const kwargs: Record<string, unknown> = {
            domain,
            fields,
            context: this.session!.userContext,
        };

        if (options.limit !== undefined) kwargs['limit'] = options.limit;
        if (options.offset !== undefined) kwargs['offset'] = options.offset;
        if (options.order !== undefined) kwargs['order'] = options.order;

        return this.callKw<T[]>(model, 'search_read', [], kwargs);
    }

    // ──────────────────────────────────────────
    // Generic Method Call
    // ──────────────────────────────────────────

    /**
     * Call any method on any Odoo model via stateless execute_kw.
     */
    async callKw<T = unknown>(
        model: string,
        method: string,
        args: unknown[] = [],
        kwargs: Record<string, unknown> = {},
    ): Promise<T> {
        this.assertAuthenticated();

        return this.transport.call<T>(model, method, args, {
            ...kwargs,
            context: kwargs['context'] ?? this.session!.userContext,
        });
    }

    // ──────────────────────────────────────────
    // Private
    // ──────────────────────────────────────────

    private assertAuthenticated(): void {
        if (!this.isAuthenticated()) {
            throw new SessionExpiredError();
        }
    }

    private async clearSession(): Promise<void> {
        this.session = null;
        this.transport.setJwt(null);
        await this.sessionStorage.clear(this.storageKey);
    }
}
