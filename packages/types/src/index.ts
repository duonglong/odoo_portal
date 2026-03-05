// Connection & Auth
export type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
    SavedConnection,
} from './connection.js';

// Domain & Search
export type {
    OdooOperator,
    OdooDomainLeaf,
    OdooDomainLogic,
    OdooDomain,
    SearchOptions,
    PaginationInfo,
} from './domain.js';

// JSON-RPC Protocol
export type {
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcError,
    OdooRpcErrorData,
    AuthenticateResult,
    CallKwParams,
    DatabaseListResult,
} from './rpc.js';

// Model & Field Mapping
export type {
    FieldMap,
    ModelMapping,
    ModelMappingRegistry,
    OdooMany2One,
    OdooX2Many,
    OdooRecord,
} from './model.js';

// Repository
export type {
    Repository,
    PaginatedResult,
} from './repository.js';

// Module System
export type {
    PortalModule,
    PortalRouteConfig,
    ModuleRegistration,
    ScreenComponent,
} from './module.js';

// Errors
export type {
    OdooPortalError,
    NetworkError,
    AuthenticationError,
    AccessDeniedError,
    RpcError,
    RecordNotFoundError,
    SessionExpiredError,
    PortalError,
} from './errors.js';
