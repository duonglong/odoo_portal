import type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
} from './types/connection.js';
import type { OdooDomain, SearchOptions } from './types/domain.js';

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
    private _restorePromise: Promise<OdooSession | null> | null = null;
    private onSessionExpiredHandler?: () => void;
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

    /** Register a callback invoked when any API call gets a 401 (BFF session expired). */
    setOnSessionExpired(handler: () => void): void {
        this.onSessionExpiredHandler = handler;
    }

    // ──────────────────────────────────────────
    // Authentication
    // ──────────────────────────────────────────

    /**
     * Authenticate with the Odoo instance.
     * Supports both password and API key (Odoo 19).
     */
    async authenticate(credentials: AuthCredentials): Promise<OdooSession> {
        try {
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
        } catch (err) {
            if (err instanceof AuthenticationError) throw err;
            throw new AuthenticationError(err instanceof Error ? err.message : 'Authentication failed');
        }
    }

    /**
     * Restore a previously saved session.
     * Checks JWT expiry locally — no BFF round-trip on restore.
     * The first real API call validates against the BFF; a 401 triggers onSessionExpired.
     *
     * Concurrent calls (e.g. React StrictMode double-invoke) share a single
     * in-flight promise so they can't race to call clearSession() on each other.
     */
    async restoreSession(): Promise<OdooSession | null> {
        if (this._restorePromise) {
            return this._restorePromise;
        }
        this._restorePromise = this._doRestoreSession().finally(() => {
            this._restorePromise = null;
        });
        return this._restorePromise;
    }

    private async _doRestoreSession(): Promise<OdooSession | null> {
        const saved = await this.sessionStorage.load(this.storageKey);
        if (!saved?.proxyJwt) {
            await this.clearSession();
            return null;
        }

        // Validate expiry locally — avoids a network call on every page refresh.
        // If expired, clear and force re-login.
        if (this._isJwtExpired(saved.proxyJwt!)) {
            await this.clearSession();
            return null;
        }

        this.session = saved;
        this.transport.setJwt(saved.proxyJwt);
        return this.session;
    }

    private _isJwtExpired(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
        } catch {
            return true; // unparseable → treat as expired
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

    /** Get the BFF proxy base URL (the URL ApiTransport was initialised with) */
    getProxyUrl(): string {
        return this.transport.getBaseUrl();
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

        try {
            return await this.transport.call<T>(model, method, args, {
                ...kwargs,
                context: kwargs['context'] ?? this.session!.userContext,
            });
        } catch (err) {
            if (err instanceof SessionExpiredError) {
                // BFF returned 401 — clear in-memory session and notify React
                this.session = null;
                this.transport.setJwt(null);
                this.onSessionExpiredHandler?.();
            }
            throw err;
        }
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
