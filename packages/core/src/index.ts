// Providers
export { OdooProvider, useOdooContext } from './providers/index.js';

// Hooks
export { useAuth, useUserGroups, useOdooErrorToast, mapOdooError } from './hooks/index.js';
export type { OdooErrorToast } from './hooks/index.js';

// Module System
export { ModuleRegistry, useModules } from './modules/index.js';

// Re-export essentials from lower packages
export type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
    OdooDomain,
    SearchOptions,
    PortalModule,
    PortalRouteConfig,
    ModuleRegistration,
} from '@odoo-portal/types';

export {
    OdooClient,
    type OdooClientOptions,
    type SessionStorage,
    mapFromOdoo,
    getOdooFields,
} from '@odoo-portal/odoo-client';

export * from './utils.js';
