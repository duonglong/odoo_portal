/**
 * JSON-RPC 2.0 request/response types for Odoo communication.
 */

/** JSON-RPC request envelope */
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: 'call';
    id: number;
    params: Record<string, unknown>;
}

/** Odoo-specific JSON-RPC error data */
export interface OdooRpcErrorData {
    name: string;
    debug: string;
    message: string;
    arguments: unknown[];
    context: Record<string, unknown>;
}

/** JSON-RPC error envelope */
export interface JsonRpcError {
    code: number;
    message: string;
    data: OdooRpcErrorData;
}

/** JSON-RPC response envelope */
export interface JsonRpcResponse<T = unknown> {
    jsonrpc: '2.0';
    id: number;
    result?: T;
    error?: JsonRpcError;
}

/** Odoo authentication response */
export interface AuthenticateResult {
    uid: number | false;
    session_id: string;
    username: string;
    name: string;
    partner_id: number;
    company_id: number;
    user_context: Record<string, unknown>;
    server_version: string;
    server_version_info: unknown[];
}

/** Odoo call_kw params structure */
export interface CallKwParams {
    model: string;
    method: string;
    args: unknown[];
    kwargs: Record<string, unknown>;
}

/** Odoo database list response */
export type DatabaseListResult = string[];
