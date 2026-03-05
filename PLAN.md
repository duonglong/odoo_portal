# Odoo Portal Framework — Detailed Implementation Plan

> A generic, cross-platform (web + mobile) portal framework that connects to **any Odoo 19 instance**.

## Tech Stack

| Concern | Choice |
|---------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (strict) |
| Platform | Expo (universal — web + iOS + Android) |
| Styling | NativeWind (Tailwind CSS) |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Navigation | Expo Router v4 |
| API Protocol | Odoo JSON-RPC (+ API Key auth) |

> **Note**: Odoo's `/jsonrpc` endpoint is deprecated in Odoo 20 (fall 2026). The `odoo-client` package
> abstracts the transport layer so migrating to the new "External JSON-2 API" is a single adapter change.

---

## Phase 1 — Foundation

**Goal**: Scaffold monorepo, create type contracts, build a fully tested Odoo JSON-RPC client.

### 1.1 Monorepo Scaffold

**Files to create:**

```
odoo_portal/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace package locations
├── turbo.json                # Build pipeline config
├── tsconfig.base.json        # Shared TypeScript config
├── .gitignore
├── .nvmrc                    # Node version (22 LTS)
├── .env.example              # Document required env vars
└── packages/
    ├── types/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts
    ├── odoo-client/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts
    └── core/
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts
```

**Key decisions:**
- Node 22 LTS
- pnpm 9+
- `"type": "module"` in all packages
- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)

**Acceptance criteria:**
- `pnpm install` works
- `pnpm turbo build` compiles all packages
- Packages can import from each other via workspace references

---

### 1.2 `@odoo-portal/types`

**Purpose**: Shared contracts — zero runtime code, pure type declarations.

**Files:**

```
packages/types/src/
├── index.ts                  # Re-exports everything
├── connection.ts             # OdooConnectionConfig, OdooSession, AuthCredentials
├── domain.ts                 # OdooDomain filter types, OdooOperator
├── rpc.ts                    # JSON-RPC request/response envelope types
├── model.ts                  # ModelMapping, FieldMap, SearchOptions, PaginationOptions
├── repository.ts             # Generic Repository<T> interface
├── module.ts                 # PortalModule contract, RouteConfig
└── errors.ts                 # OdooError, AuthError, NetworkError types
```

**Key interfaces:**

```typescript
// connection.ts
interface OdooConnectionConfig {
  url: string;       // 'https://mycompany.odoo.com'
  database: string;  // 'mycompany_prod'
}

interface AuthCredentials {
  login: string;
  password: string;  // Can be password or API key (Odoo 19)
}

interface OdooSession {
  sessionId: string;
  uid: number;
  username: string;
  partnerId: number;
  userContext: Record<string, unknown>;
  serverVersion: string;
  userGroups: number[];
}

// domain.ts
type OdooOperator = '=' | '!=' | '>' | '<' | '>=' | '<='
  | 'like' | 'ilike' | 'in' | 'not in' | 'child_of' | 'parent_of';
type OdooDomainLeaf = [string, OdooOperator, unknown];
type OdooDomainLogic = '&' | '|' | '!';
type OdooDomain = Array<OdooDomainLeaf | OdooDomainLogic>;

// rpc.ts
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: 'call';
  id: number;
  params: Record<string, unknown>;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data: { name: string; debug: string } };
}

// repository.ts
interface Repository<T> {
  find(id: number): Promise<T | null>;
  search(domain: OdooDomain, options?: SearchOptions): Promise<T[]>;
  searchCount(domain: OdooDomain): Promise<number>;
  create(data: Partial<T>): Promise<number>;
  update(id: number, data: Partial<T>): Promise<boolean>;
  delete(id: number): Promise<boolean>;
}

interface SearchOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;   // 'name asc, id desc'
}

// module.ts
interface PortalModule {
  id: string;              // 'attendance'
  name: string;            // 'Attendance'
  icon: string;            // 'clock'
  requiredModels: string[];    // ['hr.attendance']
  requiredGroups?: string[];   // ['hr.group_hr_user']
  routes: PortalRouteConfig[];
}

interface PortalRouteConfig {
  path: string;           // '/attendance'
  title: string;
  icon?: string;
  showInNav?: boolean;    // Show in tab/sidebar navigation
}
```

**Acceptance criteria:**
- All types compile with `strict: true`
- No runtime dependencies (only `devDependencies`)
- 100% exported via `index.ts`

---

### 1.3 `@odoo-portal/odoo-client`

**Purpose**: Stateless JSON-RPC transport — handles Odoo protocol details, auth, and error normalization.

**Files:**

```
packages/odoo-client/src/
├── index.ts                  # Public API exports
├── odoo-client.ts            # Main OdooClient class
├── json-rpc-transport.ts     # Low-level JSON-RPC fetch wrapper
├── auth.ts                   # authenticate, logout, session validation
├── errors.ts                 # OdooClientError, map Odoo errors to typed errors
├── session-storage.ts        # Interface + in-memory implementation
├── mappers/
│   ├── field-mapper.ts       # Generic Odoo field ↔ domain mapping utility
│   └── relation-mapper.ts    # Handle many2one [id, name] → { id, name }
└── __tests__/
    ├── odoo-client.test.ts
    ├── json-rpc-transport.test.ts
    ├── auth.test.ts
    └── field-mapper.test.ts
```

**Key classes:**

```typescript
// odoo-client.ts
class OdooClient {
  private transport: JsonRpcTransport;
  private session: OdooSession | null = null;

  constructor(config: OdooConnectionConfig);

  // Auth
  async authenticate(credentials: AuthCredentials): Promise<OdooSession>;
  async logout(): Promise<void>;
  isAuthenticated(): boolean;
  getSession(): OdooSession | null;

  // CRUD — generic, works with any model
  async searchRead<T>(
    model: string,
    domain: OdooDomain,
    fields: string[],
    options?: SearchOptions,
  ): Promise<T[]>;

  async read<T>(model: string, ids: number[], fields: string[]): Promise<T[]>;
  async create(model: string, values: Record<string, unknown>): Promise<number>;
  async write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean>;
  async unlink(model: string, ids: number[]): Promise<boolean>;
  async searchCount(model: string, domain: OdooDomain): Promise<number>;

  // Escape hatch — call any Odoo model method
  async callKw<T>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>,
  ): Promise<T>;
}

// json-rpc-transport.ts
class JsonRpcTransport {
  constructor(baseUrl: string);
  async call<T>(endpoint: string, params: Record<string, unknown>): Promise<T>;
}

// session-storage.ts — abstracted for platform flexibility
interface SessionStorage {
  save(key: string, session: OdooSession): Promise<void>;
  load(key: string): Promise<OdooSession | null>;
  clear(key: string): Promise<void>;
}

// In-memory default; apps/portal will provide SecureStore adapter for mobile
class InMemorySessionStorage implements SessionStorage { ... }
```

**JSON-RPC endpoints used:**

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Authenticate | `/web/session/authenticate` | POST |
| Get session info | `/web/session/get_session_info` | POST |
| Destroy session | `/web/session/destroy` | POST |
| Search/Read | `/web/dataset/call_kw` | `search_read` |
| Read | `/web/dataset/call_kw` | `read` |
| Create | `/web/dataset/call_kw` | `create` |
| Write | `/web/dataset/call_kw` | `write` |
| Unlink | `/web/dataset/call_kw` | `unlink` |
| Any method | `/web/dataset/call_kw` | custom |
| DB list | `/web/database/list` | POST |

**Error handling strategy:**
- Network errors → `NetworkError`
- Odoo RPC errors → `OdooRpcError` (with original debug info)
- Auth failures → `AuthenticationError`
- Access denied → `AccessDeniedError`
- Record not found → `RecordNotFoundError`

**Acceptance criteria:**
- All CRUD methods work against a real Odoo 19 instance
- Auth with both password and API key
- All errors are typed and informative
- 80%+ test coverage with mocked transport
- No React or platform dependencies — pure TypeScript

---

## Phase 2 — Core React Layer

**Goal**: Bridge `odoo-client` to React with hooks and providers. Create the Expo app shell with login.

### 2.1 `@odoo-portal/core`

**Files:**

```
packages/core/src/
├── index.ts
├── providers/
│   ├── odoo-provider.tsx      # React context holding OdooClient instance
│   └── auth-provider.tsx      # Login/logout state, session persistence
├── hooks/
│   ├── use-auth.ts            # Login, logout, session state
│   ├── use-odoo-query.ts      # TanStack Query wrapper for searchRead
│   ├── use-odoo-mutation.ts   # TanStack Query mutations (create/write/unlink)
│   ├── use-odoo-count.ts      # Count records
│   └── use-connection.ts      # Access current OdooClient instance
├── modules/
│   ├── module-registry.ts     # Register/list portal modules
│   └── use-modules.ts         # Hook: returns modules accessible to current user
└── __tests__/
    ├── use-auth.test.ts
    └── use-odoo-query.test.ts
```

**Key APIs:**

```typescript
// Provider — wraps the app
<OdooProvider>
  <AuthProvider sessionStorage={expoSecureStore}>
    <App />
  </AuthProvider>
</OdooProvider>

// Hooks — used by feature modules
const { login, logout, session, isAuthenticated } = useAuth();

const { data, isLoading, error } = useOdooQuery({
  model: 'sale.order',
  domain: [['state', '=', 'sale']],
  fields: ['name', 'amount_total', 'partner_id'],
  options: { limit: 20, order: 'create_date desc' },
});

const { mutate: createOrder } = useOdooMutation('sale.order', 'create');

// Module registry
ModuleRegistry.register(attendanceModule);
const modules = useModules(); // filters by user's Odoo groups
```

**Acceptance criteria:**
- Hooks work with mocked OdooClient
- Provider properly manages connection lifecycle
- Module registry filters by user groups
- No platform-specific code (works on web + native)

---

### 2.2 `apps/portal` — Expo App Shell

**Files:**

```
apps/portal/
├── app.json                   # Expo config
├── package.json
├── tailwind.config.ts         # NativeWind configuration
├── global.css                 # Tailwind imports + theme tokens
├── metro.config.js            # Metro bundler config for monorepo
├── app/
│   ├── _layout.tsx            # Root layout (providers, TanStack QueryClient)
│   ├── (auth)/
│   │   ├── _layout.tsx        # Auth layout (no tabs)
│   │   ├── login.tsx          # URL + credentials form
│   │   └── select-database.tsx  # Database picker (if multiple)
│   ├── (app)/
│   │   ├── _layout.tsx        # Authenticated layout (tabs/drawer)
│   │   ├── index.tsx          # Dashboard / home
│   │   └── settings.tsx       # User profile, connection info
├── components/
│   ├── ui/                    # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── LoadingState.tsx
│   └── layout/
│       ├── TabBar.tsx
│       └── Header.tsx
├── lib/
│   ├── session-storage.ts     # SecureStore adapter for SessionStorage interface
│   └── query-client.ts        # TanStack QueryClient config
└── constants/
    └── theme.ts               # Design tokens (colors, spacing, fonts)
```

**Login flow:**

```
1. User opens app → checks for saved session (SecureStore)
   ├── Session found → validate with getSessionInfo() → go to (app)
   └── No session → go to (auth)/login

2. Login screen:
   ├── Odoo URL input (https://mycompany.odoo.com)
   ├── [Optional] "List databases" button → fetches /web/database/list
   ├── Email input
   ├── Password / API Key input
   └── [Login] → authenticate → save session → go to (app)

3. (app) layout:
   ├── Reads ModuleRegistry → generates tab/drawer items
   ├── Filters modules by user groups
   └── Shows only accessible modules
```

**NativeWind theme tokens:**

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-primary: 59 130 246;     /* blue-500 */
    --color-secondary: 100 116 139;  /* slate-500 */
    --color-success: 34 197 94;      /* green-500 */
    --color-danger: 239 68 68;       /* red-500 */
    --color-background: 255 255 255;
    --color-surface: 248 250 252;
    --color-text: 15 23 42;
  }
  .dark {
    --color-background: 15 23 42;
    --color-surface: 30 41 59;
    --color-text: 248 250 252;
  }
}
```

**Acceptance criteria:**
- App runs on web (`npx expo start --web`), iOS simulator, Android emulator
- Login screen connects to any Odoo 19 URL
- Session persists across app restarts (SecureStore on mobile, AsyncStorage on web)
- Tab navigation shows registered modules
- Dark mode toggle works

---

## Phase 3 — First Module (Attendance)

**Goal**: Build the Attendance module as a reference implementation for the module system.

### 3.1 `modules/attendance`

**Files:**

```
modules/attendance/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts               # Module registration + exports
│   ├── module.ts              # PortalModule definition
│   ├── types.ts               # AttendanceRecord, CheckInStatus
│   ├── hooks/
│   │   ├── use-attendance.ts   # Current check-in state
│   │   ├── use-attendance-history.ts  # Past records
│   │   └── use-check-in-out.ts # Mutation: check in / check out
│   ├── screens/
│   │   ├── AttendanceHome.tsx  # Main screen — check in/out button + today's status
│   │   └── AttendanceHistory.tsx  # List of past attendance records
│   └── components/
│       ├── CheckInOutButton.tsx  # Large check-in/out toggle
│       ├── AttendanceCard.tsx    # Single record display
│       └── WorkHoursSummary.tsx  # Hours worked today/week/month
```

**Odoo model mapping:**

```typescript
// types.ts
interface AttendanceRecord {
  id: number;
  checkIn: Date;
  checkOut: Date | null;
  workedHours: number;
  employeeName: string;
}

// Mapping to Odoo's hr.attendance
const attendanceMapping = {
  model: 'hr.attendance',
  fields: {
    id: 'id',
    checkIn: 'check_in',
    checkOut: 'check_out',
    workedHours: 'worked_hours',
    employeeName: 'employee_id',  // many2one → display_name
  },
};
```

**Odoo API calls used:**

| Action | Odoo Method | Details |
|--------|-------------|---------|
| Get current status | `hr.employee.read` | Check `attendance_state` field |
| Check In | `hr.attendance.create` | `{ employee_id, check_in: now }` |
| Check Out | `hr.attendance.write` | Set `check_out` on latest record |
| History | `hr.attendance.search_read` | Filter by employee + date range |
| Or simpler | `hr.employee.attendance_manual` | Built-in toggle method |

**Module registration:**

```typescript
// module.ts
export const attendanceModule: PortalModule = {
  id: 'attendance',
  name: 'Attendance',
  icon: 'clock',
  requiredModels: ['hr.attendance'],
  requiredGroups: ['base.group_user'],
  routes: [
    { path: '/attendance', title: 'Check In/Out', icon: 'clock', showInNav: true },
    { path: '/attendance/history', title: 'History', icon: 'calendar' },
  ],
};
```

**Acceptance criteria:**
- Check in / check out works against real Odoo 19
- Attendance history displays correctly with pagination
- Module auto-appears in navigation when `hr.attendance` model exists
- Module hidden when user lacks required Odoo groups
- Works on web + mobile

---

## Phase 4 — Polish & Production Readiness

**Goal**: Harden the app for real-world use.

### 4.1 Multi-Instance Connection Switching
- Save multiple Odoo connections in SecureStore
- "Switch instance" screen (like Slack workspace switcher)
- Each connection has its own session + cached data

### 4.2 Offline Support
- TanStack Query `persistQueryClient` with AsyncStorage
- Show cached data when offline with "offline" banner
- Queue mutations (check-in/out) for retry when back online

### 4.3 Push Notifications
- `expo-notifications` for leave approvals, delivery assignments
- Optional: Odoo webhook → push notification service → app

### 4.4 Theming / White-Label
- CSS variable-based themes (already set up in Phase 2)
- Config file to customize colors, logo, app name per deployment
- Dark/light mode auto-detection

### 4.5 Security
- Biometric unlock (`expo-local-authentication`)
- Session expiry detection + auto re-login prompt
- API key rotation guidance in docs

### 4.6 Testing & CI/CD
- GitHub Actions: lint → type-check → test → build
- EAS Build for iOS/Android distribution
- Expo Updates for OTA web + mobile updates

**Acceptance criteria:**
- App survives offline → online transitions
- Multiple Odoo instances work independently
- CI pipeline passes on every PR
- App can be white-labeled via config only (no code changes)
