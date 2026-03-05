/**
 * Typed error classes for the Odoo client.
 */

export class OdooClientError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'OdooClientError';
    }
}

export class NetworkError extends OdooClientError {
    readonly url: string;

    constructor(url: string, cause?: unknown) {
        super(`Network error: unable to reach ${url}`, { cause });
        this.name = 'NetworkError';
        this.url = url;
    }
}

export class AuthenticationError extends OdooClientError {
    constructor(message = 'Authentication failed: invalid credentials or API key') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AccessDeniedError extends OdooClientError {
    readonly model?: string;
    readonly operation?: string;

    constructor(message: string, model?: string, operation?: string) {
        super(message);
        this.name = 'AccessDeniedError';
        this.model = model;
        this.operation = operation;
    }
}

export class SessionExpiredError extends OdooClientError {
    constructor() {
        super('Session expired, please log in again');
        this.name = 'SessionExpiredError';
    }
}

export class RpcError extends OdooClientError {
    readonly code: number;
    readonly odooErrorName: string;
    readonly debug: string;

    constructor(message: string, code: number, odooErrorName: string, debug: string) {
        super(message);
        this.name = 'RpcError';
        this.code = code;
        this.odooErrorName = odooErrorName;
        this.debug = debug;
    }
}
