// Connection & Auth
export type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
} from './connection.js';

// Domain & Search
export type {
    OdooOperator,
    OdooDomainLeaf,
    OdooDomainLogic,
    OdooDomain,
    SearchOptions,
} from './domain.js';

// JSON-RPC Protocol
export type {
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcError,
    OdooRpcErrorData,
    AuthenticateResult,
    CallKwParams,
} from './rpc.js';

// Model & Field Mapping
export type {
    FieldMap,
    ModelMapping,
    OdooMany2One,
    OdooX2Many,
    OdooRecord,
} from './model.js';

// Module System
export type {
    PortalModule,
    PortalRouteConfig,
    ModuleRegistration,
    ScreenComponent,
    DashboardWidget,
} from './module.js';

// Attendance & HR
export type {
    LeaveType,
    LeaveAllocation,
    Leave,
    LeaveRequest,
    LeaveBalance,
} from './attendance.js';
