// Providers
export { OdooProvider, useOdooContext } from './providers/index.js';

// Hooks
export {
    useAuth,
    useUserGroups,
    useOdooQuery,
    useOdooCount,
    useOdooCreate,
    useOdooUpdate,
    useOdooDelete,
    useOdooCall,
} from './hooks/index.js';

export type {
    UseOdooQueryOptions,
    UseOdooCountOptions,
    UseOdooCreateOptions,
    UseOdooUpdateOptions,
    UseOdooDeleteOptions,
    UseOdooCallOptions,
} from './hooks/index.js';

// Module System
export { ModuleRegistry, useModules, useAllModules } from './modules/index.js';

// Stores
export {
    useConnectionStore,
    createConnectionStore,
} from './stores/index.js';
export type { ConnectionState } from './stores/index.js';

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
    Repository,
    SavedConnection,
} from '@odoo-portal/types';

export {
    OdooClient,
    type OdooClientOptions,
    type SessionStorage,
    mapFromOdoo,
    mapToOdoo,
    getOdooFields,
} from '@odoo-portal/odoo-client';
