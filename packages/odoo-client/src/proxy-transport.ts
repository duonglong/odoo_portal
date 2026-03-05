import type { JsonRpcRequest, JsonRpcResponse } from '@odoo-portal/types';
import { NetworkError, AccessDeniedError, RpcError, SessionExpiredError } from './errors.js';

/**
 * ProxyTransport — sends JSON-RPC calls through the BFF proxy.
 *
 * Used on web where the browser cannot call Odoo directly due to CORS.
 * The proxy holds the Odoo session cookie server-side; this transport
 * only needs to send a JWT `Authorization` header.
 *
 * API shape expected by the proxy:
 *   POST {proxyUrl}/proxy
 *   Authorization: Bearer <jwt>
 *   { "endpoint": "/web/dataset/call_kw", "params": { ... } }
 */
export class ProxyTransport {
    private requestId = 0;
    private jwt: string | null = null;
    private proxyUrl: string;

    constructor(proxyUrl: string) {
        this.proxyUrl = proxyUrl.replace(/\/$/, '');
    }

    setJwt(token: string | null): void {
        this.jwt = token;
    }

    getJwt(): string | null {
        return this.jwt;
    }

    /**
     * Authenticate through the proxy's /auth/login endpoint.
     *
     * Returns the parsed session object and stores the JWT internally.
     */
    async login(params: {
        url: string;
        database: string;
        login: string;
        password: string;
    }): Promise<{
        token: string;
        session: {
            uid: number;
            name: string;
            username: string;
            partnerId: number;
            companyId: number;
            userContext: Record<string, unknown>;
            serverVersion: string;
            isAuthenticated: boolean;
        };
    }> {
        let response: Response;
        try {
            response = await fetch(`${this.proxyUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
        } catch (err) {
            throw new NetworkError(`${this.proxyUrl}/auth/login`, err);
        }

        const json = await response.json() as { token?: string; session?: Record<string, unknown>; error?: string };

        if (!response.ok || json.error) {
            throw new Error(json.error ?? `Login failed with HTTP ${response.status}`);
        }

        this.jwt = json.token!;
        return json as { token: string; session: { uid: number; name: string; username: string; partnerId: number; companyId: number; userContext: Record<string, unknown>; serverVersion: string; isAuthenticated: boolean } };
    }

    /** Logout through the proxy's /auth/logout endpoint */
    async logout(): Promise<void> {
        try {
            await fetch(`${this.proxyUrl}/auth/logout`, {
                method: 'POST',
                headers: this.authHeaders(),
            });
        } catch {
            // Ignore — best effort
        }
        this.jwt = null;
    }

    /**
     * Forward a JSON-RPC call through the proxy.
     *
     * Mirrors the interface of JsonRpcTransport.call() so OdooClient
     * can swap transports without changing any call sites.
     */
    async call<T = unknown>(
        endpoint: string,
        params: Record<string, unknown>,
    ): Promise<T> {
        if (!this.jwt) {
            throw new SessionExpiredError();
        }

        const body = {
            endpoint,
            params,
        };

        let response: Response;
        try {
            response = await fetch(`${this.proxyUrl}/proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.authHeaders(),
                },
                body: JSON.stringify(body),
            });
        } catch (err) {
            throw new NetworkError(`${this.proxyUrl}/proxy`, err);
        }

        if (response.status === 401) {
            this.jwt = null;
            throw new SessionExpiredError();
        }

        if (!response.ok) {
            throw new NetworkError(
                `${this.proxyUrl}/proxy`,
                new Error(`HTTP ${response.status}: ${response.statusText}`),
            );
        }

        const json = (await response.json()) as JsonRpcResponse<T>;

        if (json.error) {
            throw createProxyRpcError(json.error);
        }

        return json.result as T;
    }

    // setSessionId is a no-op for the proxy transport —
    // session management is entirely server-side.
    setSessionId(_sessionId: string | null): void { /* noop */ }

    getBaseUrl(): string {
        return this.proxyUrl;
    }

    private authHeaders(): Record<string, string> {
        return this.jwt ? { Authorization: `Bearer ${this.jwt}` } : {};
    }
}

// ── Error factory (mirrors json-rpc-transport.ts) ─────────────────────────────

function createProxyRpcError(rpcError: NonNullable<JsonRpcResponse['error']>): Error {
    const data = rpcError.data;
    const message = data?.message || rpcError.message || 'Unknown Odoo RPC error';

    if (data?.name?.includes('AccessDenied') || data?.name?.includes('access_denied')) {
        return new AccessDeniedError(message);
    }

    if (data?.name?.includes('SessionExpiredException')) {
        return new SessionExpiredError();
    }

    return new RpcError(
        message,
        rpcError.code,
        data?.name ?? 'UnknownError',
        data?.debug ?? '',
    );
}
