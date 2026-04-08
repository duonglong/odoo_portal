import { OdooClient, ApiTransport } from '@odoo-portal/odoo-client';
import type { OdooConnectionConfig } from '@odoo-portal/odoo-client';
import { platformSessionStorage } from './storage.js';

/**
 * BFF proxy URL. All calls run through this proxy for security, CORS bypass, and session management.
 *
 * Default: http://localhost:3001 (development proxy server)
 */
const PROXY_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/**
 * Create an OdooClient configured to talk to the Backend-For-Frontend (BFF).
 * We completely decouple the frontend from Odoo credentials by routing all 
 * traffic through `apps/api`.
 */
export function createOdooClient(config: OdooConnectionConfig): OdooClient {
    const apiTransport = new ApiTransport(PROXY_URL);
    return new OdooClient(config, {
        sessionStorage: platformSessionStorage,
        transport: apiTransport,
    });
}
