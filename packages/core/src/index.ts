// Providers
export { OdooProvider, useOdooContext } from './providers/index.js';

// Hooks
export { useAuth, useUserGroups, useOdooErrorToast, mapOdooError } from './hooks/index.js';
export type { OdooErrorToast } from './hooks/index.js';
export { toast, type ToastMessage } from './toast.js';

// Module System
export { ModuleRegistry, useModules } from './modules/index.js';

// Internal Type Exports
export type * from './types/module.js';

export {
    OdooClient,
    type OdooClientOptions,
    type SessionStorage,
    mapFromOdoo,
    getOdooFields,
} from '@odoo-portal/odoo-client';

export * from './utils.js';
