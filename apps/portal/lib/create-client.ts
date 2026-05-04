import { OdooClient, ApiTransport } from '@odoo-portal/odoo-client';
import type { OdooConnectionConfig } from '@odoo-portal/odoo-client';
import { platformSessionStorage } from './storage.js';
import { appConfig } from './app-config.js';

/**
 * Create an OdooClient configured to talk to the Backend-For-Frontend (BFF).
 * We completely decouple the frontend from Odoo credentials by routing all 
 * traffic through `apps/api`.
 */
export function createOdooClient(config: OdooConnectionConfig): OdooClient {
    const apiTransport = new ApiTransport(appConfig.apiUrl);
    return new OdooClient(config, {
        sessionStorage: platformSessionStorage,
        transport: apiTransport,
    });
}
