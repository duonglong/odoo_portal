// Client
export { OdooClient } from './odoo-client.js';
export type { OdooClientOptions } from './odoo-client.js';

// Transport
export { ApiTransport } from './api-transport.js';

// Session
export { InMemorySessionStorage } from './session-storage.js';
export type { SessionStorage } from './session-storage.js';

// Errors
export {
    OdooClientError,
    NetworkError,
    AuthenticationError,
    AccessDeniedError,
    SessionExpiredError,
    RpcError,
} from './errors.js';

// Mappers
export {
    mapFromOdoo,
    getOdooFields,
} from './mappers/index.js';

// Types
export type * from './types/domain.js';
export type * from './types/model.js';
export type * from './types/rpc.js';
export type * from './types/connection.js';
