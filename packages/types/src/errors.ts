/**
 * Typed error classes for the Odoo portal.
 * All errors extend OdooPortalError for catch-all handling.
 */

/** Base error for all portal errors */
export interface OdooPortalError {
    name: string;
    message: string;
    /** Original error for debugging */
    cause?: unknown;
}

/** Network unreachable — Odoo server is down or URL is wrong */
export interface NetworkError extends OdooPortalError {
    name: 'NetworkError';
    url: string;
}

/** Authentication failed — wrong credentials or expired session */
export interface AuthenticationError extends OdooPortalError {
    name: 'AuthenticationError';
}

/** Access denied — user lacks permissions for this operation */
export interface AccessDeniedError extends OdooPortalError {
    name: 'AccessDeniedError';
    model?: string;
    operation?: string;
}

/** Odoo RPC error — server returned a JSON-RPC error */
export interface RpcError extends OdooPortalError {
    name: 'RpcError';
    code: number;
    /** Odoo error class name, e.g. 'odoo.exceptions.ValidationError' */
    odooErrorName: string;
    /** Full debug traceback from Odoo (only in dev mode) */
    debug: string;
}

/** Record not found */
export interface RecordNotFoundError extends OdooPortalError {
    name: 'RecordNotFoundError';
    model: string;
    recordId: number;
}

/** Session expired — need to re-authenticate */
export interface SessionExpiredError extends OdooPortalError {
    name: 'SessionExpiredError';
}

/** Union of all portal error types */
export type PortalError =
    | NetworkError
    | AuthenticationError
    | AccessDeniedError
    | RpcError
    | RecordNotFoundError
    | SessionExpiredError;
