import type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
    OdooDomain,
    SearchOptions,
    AuthenticateResult,
} from '@odoo-portal/types';


import { JsonRpcTransport } from './json-rpc-transport.js';
import type { ProxyTransport } from './proxy-transport.js';
import type { SessionStorage } from './session-storage.js';
import { InMemorySessionStorage } from './session-storage.js';
import { AuthenticationError, SessionExpiredError } from './errors.js';

/** Union type for the two transport implementations */
export type OdooTransport = JsonRpcTransport | ProxyTransport;

export interface OdooClientOptions {
    /** Session storage implementation (defaults to in-memory) */
    sessionStorage?: SessionStorage;
    /** Storage key prefix for multi-instance support */
    storageKey?: string;
    /**
     * Custom transport. Defaults to JsonRpcTransport (direct Odoo calls).
     * Pass a ProxyTransport when running on web to route calls through the BFF proxy.
     */
    transport?: OdooTransport;
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
    private transport: OdooTransport;
    private session: OdooSession | null = null;
    private sessionStorage: SessionStorage;
    private storageKey: string;
    private config: OdooConnectionConfig;

    constructor(
        config: OdooConnectionConfig,
        options: OdooClientOptions = {},
    ) {
        this.config = config;
        this.transport = options.transport ?? new JsonRpcTransport(config.url);
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
        // ProxyTransport has its own login() that calls the BFF proxy.
        // We detect it by checking for the login() method.
        if ('login' in this.transport && typeof (this.transport as { login?: unknown }).login === 'function') {
            const { ProxyTransport } = await import('./proxy-transport.js');
            const proxy = this.transport as InstanceType<typeof ProxyTransport>;
            // Token is returned alongside session from the proxy
            const { session: proxySession, token } = await proxy.login({
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

        // Direct transport — call Odoo authenticate endpoint
        const result = await this.transport.call<AuthenticateResult>(
            '/web/session/authenticate',
            {
                db: this.config.database,
                login: credentials.login,
                password: credentials.password,
            },
        );

        if (!result.uid) {
            throw new AuthenticationError();
        }

        this.session = {
            sessionId: result.session_id,
            uid: result.uid,
            username: result.username,
            name: result.name,
            partnerId: result.partner_id,
            companyId: result.company_id,
            userContext: result.user_context,
            serverVersion: result.server_version,
            isAuthenticated: true,
        };

        this.transport.setSessionId(this.session.sessionId);
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

        // If we are using ProxyTransport, wire up the JWT.
        // Otherwise, wire up the Odoo sessionId.
        if ('setJwt' in this.transport && typeof (this.transport as any).setJwt === 'function') {
            if (!this.session.proxyJwt) {
                // If we don't have a JWT saved, we can't make proxy calls
                await this.clearSession();
                return null;
            }
            (this.transport as any).setJwt(this.session.proxyJwt);
        } else {
            this.transport.setSessionId(saved.sessionId);
        }

        // Validate the session is still alive
        try {
            const info = await this.transport.call<AuthenticateResult>(
                '/web/session/get_session_info',
                {},
            );

            if (!info.uid) {
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
                await this.transport.call('/web/session/destroy', {});
            } catch {
                // Ignore errors during logout — session might already be expired
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
     * Call any method on any Odoo model via call_kw.
     * This is the escape hatch for ORM methods.
     */
    async callKw<T = unknown>(
        model: string,
        method: string,
        args: unknown[] = [],
        kwargs: Record<string, unknown> = {},
    ): Promise<T> {
        this.assertAuthenticated();

        return this.transport.call<T>('/web/dataset/call_kw', {
            model,
            method,
            args,
            kwargs: {
                ...kwargs,
                context: kwargs['context'] ?? this.session!.userContext,
            },
        });
    }

    /**
     * Call any Odoo HTTP controller route directly via JSON-RPC.
     * Use this for controller endpoints that are NOT ORM methods (e.g. /hr_attendance/manual_selection).
     *
     * Example:
     *   await client.callRoute('/hr_attendance/manual_selection', { token, employee_id: 1 });
     */
    async callRoute<T = unknown>(
        endpoint: string,
        params: Record<string, unknown> = {},
    ): Promise<T> {
        this.assertAuthenticated();
        return this.transport.call<T>(endpoint, params);
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
        this.transport.setSessionId(null);
        await this.sessionStorage.clear(this.storageKey);
    }
}
