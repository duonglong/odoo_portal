import type {
    JsonRpcRequest,
    JsonRpcResponse,
} from '@odoo-portal/types';
import { NetworkError, AccessDeniedError, RpcError, SessionExpiredError } from './errors.js';

/**
 * Low-level JSON-RPC 2.0 transport for Odoo.
 *
 * Handles HTTP communication and JSON-RPC envelope encoding/decoding.
 * No business logic — just the wire protocol.
 */
export class JsonRpcTransport {
    private requestId = 0;
    private sessionId: string | null = null;

    constructor(private baseUrl: string) { }

    /** Set the session cookie for authenticated requests */
    setSessionId(sessionId: string | null): void {
        this.sessionId = sessionId;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Execute a JSON-RPC call to the given endpoint.
     *
     * @param endpoint - Odoo endpoint path, e.g. '/web/session/authenticate'
     * @param params - RPC params object
     * @returns The result field from the JSON-RPC response
     * @throws Error on network failure or JSON-RPC error
     */
    async call<T = unknown>(
        endpoint: string,
        params: Record<string, unknown>,
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const body: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'call',
            id: ++this.requestId,
            params,
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.sessionId) {
            headers['Cookie'] = `session_id=${this.sessionId}`;
        }

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                credentials: 'include',
            });
        } catch (error) {
            throw new NetworkError(url, error);
        }

        if (!response.ok) {
            throw new NetworkError(
                url,
                new Error(`HTTP ${response.status}: ${response.statusText}`),
            );
        }

        // Extract session_id from Set-Cookie header if present
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            const sessionMatch = setCookie.match(/session_id=([^;]+)/);
            if (sessionMatch?.[1]) {
                this.sessionId = sessionMatch[1];
            }
        }

        const json = (await response.json()) as JsonRpcResponse<T>;

        if (json.error) {
            throw createRpcError(json.error);
        }

        return json.result as T;
    }
}

// ---- Error factory ----

function createRpcError(rpcError: NonNullable<JsonRpcResponse['error']>): Error {
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
