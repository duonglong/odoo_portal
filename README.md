# Odoo Portal Framework

A modular, cross-platform portal for **Odoo 19** built with Expo, TypeScript, and a plug-in module architecture.

> **Status:** Foundation, core React layer, and the attendance module are implemented and type-checked. The attendance module includes a daily-log timeline, a monthly calendar view, a history screen, and a working clock-in / clock-out integration with Odoo 19.

---

## Quick Start

### Prerequisites

- **Node.js ≥ 22** ([install via nvm](https://github.com/nvm-sh/nvm))
- **pnpm ≥ 9** (`npm install -g pnpm`)

### Install & verify

```bash
pnpm install                # install all workspace dependencies
pnpm turbo typecheck        # verify types across all packages (0 errors expected)
pnpm turbo test             # run unit tests
```

### Run the app

```bash
cd apps/portal
pnpm start                  # launch the Expo dev server
```

From the Expo dev server menu:
- Press **`w`** → open in web browser
- Press **`a`** → open in Android emulator
- Press **`i`** → open in iOS simulator
- Or scan the **QR code** with Expo Go on your phone

### Building for Mobile

To build standalone standalone apps (`.apk`, `.aab`, or `.ipa`) for devices, you use **Expo Application Services (EAS)**:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```
2. **Login to Expo:**
   ```bash
   eas login
   ```
3. **Configure the project** (if `eas.json` doesn't exist yet):
   ```bash
   cd apps/portal
   eas build:configure
   ```
4. **Trigger a cloud build:**
   ```bash
   eas build -p android --profile preview  # Builds an APK for Android
   eas build -p ios --profile preview      # Builds for Simulator
   ```

*(Add `--local` to the build command to compile on your own machine instead of Expo's cloud servers. Note: Local iOS builds require macOS and Xcode).*

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  apps/portal (Expo)                  │
│   Expo Router · NativeWind · TanStack Query · Zustand│
│   Login ─→ Home ─→ [Dynamic Module Tabs]            │
├─────────────────────────────────────────────────────┤
│                 modules/attendance                   │
│       (Self-contained feature — see Module Guide)    │
├─────────────────────────────────────────────────────┤
│               packages/core (React layer)            │
│  OdooProvider · useAuth · toast · ModuleRegistry     │
├─────────────────────────────────────────────────────┤
│             packages/odoo-client (protocol)          │
│    JSON-RPC transport · OdooClient · Field Mapper    │
├─────────────────────────────────────────────────────┤
│             packages/types (contracts)               │
│  OdooSession · FieldMap · PortalModule               │
└─────────────────────────────────────────────────────┘
```

### Layer Rules

| Layer | Knows about | Never imports |
|-------|------------|---------------|
| `types` | Nothing | — |
| `odoo-client` | `types` | React, UI |
| `core` | `types`, `odoo-client` | Expo, modules |
| `modules/*` | `types`, `odoo-client`, `core` | Other modules |
| `apps/portal` | Everything | — |

---

## The Golden Rule

> **Screens → Hooks → Repository → OdooClient**
>
> Every layer only talks to the layer directly below it. If you can't test a piece of logic without rendering a component, it belongs one layer lower.

### What each layer is

#### `OdooClient` (`packages/odoo-client`)
The raw protocol driver. It speaks JSON-RPC to your Odoo server (or routes through the BFF proxy on web to avoid CORS). It knows nothing about React.

```typescript
// Low-level — you rarely call this directly in feature code
const records = await client.searchRead('hr.attendance', domain, fields);
```

#### Repository (`modules/*/src/repository.ts`)
**Where business logic lives.** A repository translates between your clean domain types and Odoo's raw fields. It owns:
- Which Odoo model to call
- What domain filters to apply (e.g. "only today's records")
- How to transform raw Odoo data into typed domain objects via `mapFromOdoo()`

```typescript
// modules/attendance/src/repository.ts
async getTodayAttendance(employeeId: number): Promise<AttendanceRecord[]> {
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.client.searchRead(
        'hr.attendance',
        [['employee_id', '=', employeeId], ['check_in', '>=', today]],
        Object.values(attendanceFieldMap),
    );
    return raw.map(r => mapFromOdoo<AttendanceRecord>(r, attendanceFieldMap));
}
```

#### Hooks (`modules/*/src/hooks.ts`)
Thin React wrappers around the repository using **TanStack Query**. They add:
- Caching and background refetching
- Loading / error states
- Auto-invalidation after mutations

```typescript
// modules/attendance/src/hooks.ts
export const useAttendanceRecords = (client, employeeId) =>
    useQuery({
        queryKey: ['attendance', 'records', employeeId],
        queryFn: () => new AttendanceRepository(client).getTodayAttendance(employeeId),
    });
```

#### Screens (`modules/*/src/screens/*.tsx`, `apps/portal/src/screens/`)
Pure presentation. Screens call hooks and render data — they never call `OdooClient` or build Odoo domains directly.

```typescript
// ✅ Correct
const { data: records } = useAttendanceRecords(client, employeeId);

// ❌ Wrong — domain logic in JSX
const today = records.filter(r => r.checkIn.startsWith(new Date().toISOString().slice(0, 10)));
```

---

## Monorepo Structure

```
odoo_portal/
├── packages/
│   ├── types/              ← Shared TypeScript interfaces (no runtime deps)
│   ├── odoo-client/        ← JSON-RPC + BFF proxy client, auth, CRUD, field mapper
│   └── core/               ← React providers, hooks, module registry, connection store
├── modules/
│   └── attendance/         ← Attendance feature module
│       └── src/
│           ├── types.ts
│           ├── mappings.ts
│           ├── repository.ts
│           ├── hooks.ts
│           ├── utils.ts
│           ├── module.ts
│           ├── index.ts
│           └── screens/
│               ├── AttendanceSummaryScreen.tsx  ← Daily log timeline + clock-in/out
│               ├── MyAttendanceScreen.tsx        ← Monthly calendar + stats
│               └── HistoryScreen.tsx             ← Paginated attendance history
├── apps/
│   ├── api/                ← Hono BFF proxy (resolves web CORS, holds Odoo session)
│   └── portal/             ← Expo universal app (iOS, Android, Web)
│       ├── src/
│       │   └── screens/
│       │       └── LoginScreen.tsx  ← Auth UI (portal-specific, uses expo-router)
│       └── app/            ← Expo Router file-system routes (thin entry points)
│           ├── _layout.tsx
│           ├── (auth)/
│           │   └── login.tsx           ← 1 line: re-exports LoginScreen
│           └── (app)/
│               ├── _layout.tsx         ← Auth guard + nav shell
│               ├── index.tsx           ← Dashboard
│               ├── attendance.tsx      ← re-exports AttendanceSummaryScreen
│               └── attendance/
│                   ├── history.tsx     ← re-exports HistoryScreen
│                   └── my-attendance.tsx ← re-exports MyAttendanceScreen
├── turbo.json              ← Turborepo task pipeline
├── pnpm-workspace.yaml     ← Workspace config
└── tsconfig.base.json      ← Strict TS shared config
```

---

## Key Design Decisions

### 1. Field Mapping (Adaptability Layer)

Odoo field names are snake_case and vary across installations. The **FieldMap** pattern decouples domain types from Odoo internals:

```typescript
// modules/attendance/src/mappings.ts
export const attendanceFieldMap: FieldMap = {
  checkIn:     'check_in',       // domain → odoo
  checkOut:    'check_out',
  workedHours: 'worked_hours',
  employeeId:  'employee_id',
};
```

The `mapFromOdoo()` / `mapToOdoo()` utilities handle translation:
- **many2one** `[42, "John"]` → `{ id: 42, name: "John" }`
- **false** → `null`

To adapt to a custom Odoo instance, **only change the FieldMap** — zero UI changes.

### 2. Module System

Modules are **self-registering plugins**. The app shell discovers them at startup via `ModuleRegistry`:

```
Module registers itself → ModuleRegistry stores it
                                ↓
App shell calls useModules(userGroups)
                                ↓
Only modules matching the user's Odoo groups appear in navigation
```

### 3. Session & Authentication

- **Password** and **API Key** auth supported (API key recommended for Odoo 19).
- Sessions persisted via injectable `SessionStorage` interface:
  - **Mobile:** `expo-secure-store` (encrypted keychain/keystore)
  - **Web:** `AsyncStorage` (localStorage)
- Multi-instance support: OdooClient instances cached by `URL|database` key.

### 4. Data Fetching

All data flows through **TanStack Query v5**:
- `useQuery()` — data fetching with auto caching (via repository methods)
- `useMutation()` — mutations (e.g. `useCheckInOut`) that auto-invalidate related queries
- Repository methods are the single source of truth for query functions

---

## Module Guide — How to Build a New Module

### File Structure

```
modules/my-feature/
├── package.json          ← Workspace deps: core, types, odoo-client
├── tsconfig.json
├── nativewind-env.d.ts   ← NativeWind className types
└── src/
    ├── types.ts          ← 1. Domain types (clean, no Odoo field names)
    ├── mappings.ts       ← 2. FieldMap: domain prop → Odoo field
    ├── repository.ts     ← 3. All Odoo calls, uses mapFromOdoo()
    ├── hooks.ts          ← 4. React hooks wrapping the repository
    ├── screens/          ← 5. UI components (use hooks, never OdooClient)
    │   ├── MainScreen.tsx
    │   └── DetailScreen.tsx
    ├── module.ts         ← 6. PortalModule registration
    └── index.ts          ← 7. Public API
```

### Step-by-Step

#### 1. Define Domain Types

```typescript
// src/types.ts
export interface SaleOrder {
  id: number;
  orderNumber: string;
  total: number;
  state: 'draft' | 'sale' | 'done' | 'cancel';
  customerId: { id: number; name: string } | null;
}
```

#### 2. Create Field Mappings

```typescript
// src/mappings.ts
import type { FieldMap } from '@odoo-portal/types';

export const saleOrderFieldMap: FieldMap = {
  id:          'id',
  orderNumber: 'name',
  total:       'amount_total',
  state:       'state',
  customerId:  'partner_id',
};
```

#### 3. Build the Repository

```typescript
// src/repository.ts
import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { saleOrderFieldMap } from './mappings.js';
import type { SaleOrder } from './types.js';

export class SaleOrderRepository {
  constructor(private client: OdooClient) {}

  async list(limit = 20): Promise<SaleOrder[]> {
    const raw = await this.client.searchRead(
      'sale.order',
      [],
      getOdooFields(saleOrderFieldMap),
      { limit, order: 'create_date desc' },
    );
    return raw.map((r) => mapFromOdoo<SaleOrder>(r, saleOrderFieldMap));
  }
}
```

#### 4. Write React Hooks

```typescript
// src/hooks.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { SaleOrderRepository } from './repository.js';

export const useSaleOrders = (client: OdooClient | null) => {
  const repo = useMemo(
    () => (client ? new SaleOrderRepository(client) : null),
    [client],
  );
  return useQuery({
    queryKey: ['sales', 'orders'],
    queryFn: () => repo!.list(),
    enabled: repo !== null,
  });
};
```

#### 5. Build Screens

```tsx
// src/screens/OrderListScreen.tsx
import { useAuth } from '@odoo-portal/core';
import { useSaleOrders } from '../hooks.js';

export default function OrderListScreen() {
  const { client } = useAuth();
  const { data: orders = [], isLoading } = useSaleOrders(client);
  // ... render FlatList
}
```

#### 6. Register the Module

```typescript
// src/module.ts
import type { ModuleRegistration } from '@odoo-portal/types';

export const salesModule: ModuleRegistration = {
  module: {
    id: 'sales',
    name: 'Sales',
    icon: '🛒',
    requiredModels: ['sale.order'],
    requiredGroups: ['sales_team.group_sale_salesman'],
    routes: [
      { path: '/sales', title: 'Orders', icon: '🛒', showInNav: true },
    ],
  },
  loadScreens: async () => {
    const { default: OrderList } = await import('./screens/OrderListScreen.js');
    return { OrderList };
  },
};
```

#### 7. Wire it into the App

```typescript
// apps/portal/app/_layout.tsx
import { ModuleRegistry } from '@odoo-portal/core';
import { salesModule } from '@odoo-portal/sales';

ModuleRegistry.register(salesModule);
```

Then add an Expo Router file:
```
apps/portal/app/(app)/sales.tsx → re-exports your screen
```

That's it. The tab navigator auto-discovers the module if the user has the required Odoo groups.

---

## The PortalModule Contract

```typescript
interface PortalModule {
  id: string;                // Unique identifier
  name: string;              // Display name
  icon: string;              // Tab bar / card icon
  requiredModels: string[];  // Odoo models this module needs
  requiredGroups?: string[]; // Odoo groups for access control
  routes: PortalRouteConfig[];
}

interface PortalRouteConfig {
  path: string;       // URL path (e.g. '/sales')
  title: string;      // Screen title
  icon?: string;      // Optional nav icon
  showInNav?: boolean; // Show in tab bar?
}

interface ModuleRegistration {
  module: PortalModule;
  loadScreens: () => Promise<Record<string, ScreenComponent>>;
}
```

---

---

## Extensibility Guide

Modules grow. Clients customize. This section covers how to extend without bloating.

### Extending a Module (Sub-modules)

When a feature domain gets too large, split into a **base module** and **extension modules**:

```
modules/
├── attendance/              ← Base: clock in/out, history
├── attendance-overtime/     ← Extension: overtime tracking
├── attendance-leave/        ← Extension: leave requests
└── attendance-reports/      ← Extension: analytics dashboard
```

Each extension is a **separate workspace package** that:
- Depends on the base module (`@odoo-portal/attendance`)
- Imports and reuses base types, hooks, and repository
- Has its **own `PortalModule` registration** — discovered independently by the app shell

```typescript
// modules/attendance-overtime/src/hooks.ts
import { useMyEmployee } from '@odoo-portal/attendance';  // ← reuse base hook

export const useOvertimeRecords = (client, employeeId) => {
  // ... uses its own repository for hr.attendance.overtime
};
```

**Rule of thumb:** if it has its own Odoo model(s), it's a separate module.

---

### Extending Field Mappings

#### Spread & Override (simplest)

A client adds custom fields `x_location` and `x_project_id` to `hr.attendance`:

```typescript
import { attendanceFieldMap } from '@odoo-portal/attendance';
import type { FieldMap } from '@odoo-portal/types';

const extendedFieldMap: FieldMap = {
  ...attendanceFieldMap,          // inherit all standard fields
  location:  'x_location',       // add custom fields
  projectId: 'x_project_id',
};
```

#### Factory Function (configurable deployments)

When different clients have different customizations, export a factory:

```typescript
// modules/attendance/src/mappings.ts
export const createAttendanceFieldMap = (overrides?: FieldMap): FieldMap => ({
  id: 'id',
  employeeId: 'employee_id',
  checkIn: 'check_in',
  checkOut: 'check_out',
  workedHours: 'worked_hours',
  ...overrides,
});

export const attendanceFieldMap = createAttendanceFieldMap();
```

Client project:
```typescript
const myFieldMap = createAttendanceFieldMap({
  location:  'x_location',
  projectId: 'x_studio_project_id',    // Odoo Studio field
  notes:     'x_custom_notes',
});
```

#### Extend the Domain Type Too

The extended FieldMap gives you new data, but TypeScript needs to know about it:

```typescript
import type { AttendanceRecord } from '@odoo-portal/attendance';

interface ExtendedAttendance extends AttendanceRecord {
  location: string | null;
  projectId: { id: number; name: string } | null;
}

// Then in your repository:
raw.map((r) => mapFromOdoo<ExtendedAttendance>(r, extendedFieldMap));
```

#### Override an Existing Field

Some clients rename standard fields. Spread handles this naturally:

```typescript
const clientFieldMap: FieldMap = {
  ...attendanceFieldMap,
  checkIn: 'x_arrival_time',   // overrides the base 'check_in'
};
```

Your UI still calls `record.checkIn` — it doesn't know the underlying Odoo field changed.

| Need | Pattern |
|------|---------|
| Add custom fields | `{ ...baseMap, newField: 'x_field' }` |
| Configurable per-client | Factory function `createFieldMap(overrides)` |
| Type safety for new fields | `interface Extended extends Base { ... }` |
| Replace a field name | Spread + override same key |

---

### Extending Screens

#### Pattern 1: Slots (Recommended)

The base screen exposes **render prop slots** that extensions fill:

```tsx
// modules/attendance/src/screens/ClockScreen.tsx
interface ClockScreenProps {
  headerExtra?: (employee: Employee) => React.ReactNode;
  footerExtra?: (employee: Employee) => React.ReactNode;
}

export default function ClockScreen({ headerExtra, footerExtra }: ClockScreenProps) {
  return (
    <View>
      {/* ... employee info ... */}
      {headerExtra?.(employee)}       {/* ← injection point */}
      {/* ... check-in button ... */}
      {footerExtra?.(employee)}       {/* ← injection point */}
    </View>
  );
}
```

The extension fills the slot without touching the base:

```tsx
// modules/attendance-overtime/src/screens/ExtendedClockScreen.tsx
import ClockScreen from '@odoo-portal/attendance/src/screens/ClockScreen';

export default function ExtendedClockScreen() {
  return (
    <ClockScreen
      footerExtra={(employee) => <OvertimeBadge employeeId={employee.id} />}
    />
  );
}
```

Then re-point the Expo route to the extended version.

#### Pattern 2: Wrapper (No base changes)

Wrap the entire screen and add content around it:

```tsx
// modules/attendance-overtime/src/screens/WrappedClockScreen.tsx
import ClockScreen from '@odoo-portal/attendance/src/screens/ClockScreen';

export default function WrappedClockScreen() {
  return (
    <View className="flex-1">
      <ClockScreen />
      <ProjectSelector />   {/* ← extra UI below */}
    </View>
  );
}
```

#### Pattern 3: Field Registry (Data-driven)

For the specific case of "add a data field to every row in a list," use a registry:

```typescript
// modules/attendance/src/extensions.ts
type ExtraField = {
  id: string;
  label: string;
  render: (record: AttendanceRecord & Record<string, unknown>) => React.ReactNode;
};

class FieldExtensions {
  private fields: ExtraField[] = [];
  register(field: ExtraField) { this.fields.push(field); }
  getAll() { return this.fields; }
}

export const historyScreenFields = new FieldExtensions();
```

Extensions register their fields:

```typescript
// modules/attendance-overtime/src/index.ts
import { historyScreenFields } from '@odoo-portal/attendance';

historyScreenFields.register({
  id: 'overtime',
  label: 'Overtime',
  render: (record) => <Text>{record.overtimeHours}h</Text>,
});
```

The base screen renders registered fields dynamically:

```tsx
// In HistoryScreen's row component
const extraFields = historyScreenFields.getAll();
{extraFields.map((f) => (
  <View key={f.id}>
    <Text>{f.label}</Text>
    {f.render(record)}
  </View>
))}
```

#### Pattern 4: Route Replacement

To completely replace a screen, just change the Expo route file:

```tsx
// apps/portal/app/(app)/attendance.tsx
// Before: import ClockScreen from '@odoo-portal/attendance/src/screens/ClockScreen';
// After:
import ClockScreen from '@odoo-portal/attendance-custom/src/screens/CustomClockScreen';
export default ClockScreen;
```

| Need | Pattern | Modifies base? |
|------|---------|---------------|
| Add a section above/below existing UI | **Slots** (render props) | Yes, once — add slot points |
| Add content around a screen | **Wrapper** | No |
| Add data fields to a list/card | **Field registry** | Yes, once — render registered fields |
| Completely replace a screen | **Route replacement** | No |

---

## Common Pitfalls

### 1. Missing workspace dependencies in `apps/portal`

Every `@odoo-portal/*` package that the portal app imports **must** be listed in `apps/portal/package.json` under `dependencies`. If you add a new module or start importing from a package, add it:

```jsonc
// apps/portal/package.json
"dependencies": {
    "@odoo-portal/attendance": "workspace:*",   // ← don't forget!
    "@odoo-portal/core": "workspace:*",
    "@odoo-portal/odoo-client": "workspace:*",  // ← don't forget!
    "@odoo-portal/types": "workspace:*",
    // ...
}
```

Then run `pnpm install` from the repo root.

### 2. NativeWind `className` type errors

Any package or app that uses `className` on React Native components needs **two things**:

1. A `nativewind-env.d.ts` file at the package root:
   ```ts
   /// <reference types="nativewind/types" />
   ```
2. That file listed in `tsconfig.json` → `include`:
   ```jsonc
   "include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]
   ```

Without this, TypeScript will error on every `className` prop with *"Property 'className' does not exist"*.

### 3. Always use barrel imports for modules

Module packages define `"exports": { ".": "./src/index.ts" }` — **deep path imports won't resolve**:

```ts
// ❌ WRONG — bypasses the exports map, fails typecheck
import ClockScreen from '@odoo-portal/attendance/src/screens/ClockScreen';

// ✅ CORRECT — uses the barrel export from index.ts
import { ClockScreen } from '@odoo-portal/attendance';
```

If a symbol isn't exported from the barrel, add it to `src/index.ts` in the module rather than importing a deep path.

### 4. Vitest fails when a package has no tests

`vitest run` exits with code 1 if it finds zero test files — this breaks `pnpm turbo test`. Use `--passWithNoTests` in the test script:

```jsonc
// package.json
"scripts": {
    "test": "vitest run --passWithNoTests"
}
```

This lets the package pass CI gracefully until tests are written.

---

## Tech Stack

| Concern | Technology |
|---------|-----------|
| Language | TypeScript (strict) |
| Cross-Platform | Expo (universal) |
| Navigation | Expo Router v4 (file-based, typed) |
| Styling | NativeWind v4 (Tailwind for React Native) |
| Server State | TanStack Query v5 |
| Client State | Zustand v5 |
| Odoo Protocol | JSON-RPC 2.0 via fetch |
| Build System | Turborepo + pnpm workspaces |
| Testing | Vitest |

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
ODOO_URL=http://localhost:8069
ODOO_DB=odoo19
ODOO_LOGIN=admin
ODOO_PASSWORD=admin
```

These are **optional** — the login screen lets users enter any URL at runtime.

---

## Scripts

| Command | Scope | What it does |
|---------|-------|-------------|
| `pnpm install` | All | Install all workspace dependencies |
| `pnpm turbo typecheck` | All | TypeScript strict check across all packages |
| `pnpm turbo test` | All | Run Vitest tests across all packages |
| `pnpm turbo build` | All | Build dist outputs |
| `cd apps/portal && pnpm start` | App | Launch Expo dev server (press `w`/`a`/`i` for platform) |
| `cd apps/portal && pnpm start --clear` | App | Launch with Metro cache cleared (use after dep changes) |

## BFF Proxy (`apps/api`)

The Expo **web** build cannot call Odoo's JSON-RPC API directly from the browser — the browser blocks cross-origin requests (CORS) unless Odoo is configured to allow your portal's origin. Asking every customer to change their Odoo CORS settings is impractical.

`apps/api` is a thin Hono server that sits between the web app and Odoo:

```
Browser (web)  →  apps/api (proxy)  →  Odoo  (server-to-server, no CORS)
```

- The proxy authenticates with Odoo and stores the session **server-side** (browser never sees the Odoo cookie)
- Issues a short-lived **JWT** to the web app instead
- **Mobile (native) apps bypass the proxy entirely** — native apps have no CORS restriction

### Running the proxy

```bash
# 1. Copy and configure environment
cp apps/api/.env.example apps/api/.env
# Edit: JWT_SECRET, PORTAL_ORIGINS, PORT

# 2. Start (development — hot reload)
cd apps/api
pnpm dev

# 3. Start (production)
pnpm build
node dist/index.js
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | *(required)* | Random secret for signing JWTs — change in production |
| `JWT_TTL` | `28800` | JWT lifetime in seconds (8 h) |
| `PORTAL_ORIGINS` | `http://localhost:8081` | Comma-separated allowed origins |
| `PORT` | `3001` | Port the proxy listens on |

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/auth/login` | Authenticate → returns JWT |
| `POST` | `/auth/logout` | Invalidate session |
| `POST` | `/proxy` | Forward any Odoo JSON-RPC call (JWT required) |

### Deployment

No Docker required. Deploy as a standard Node.js app:

- **VPS** — `node dist/index.js` (use `pm2` to keep it alive)
- **Railway / Render / Fly.io** — push the repo; they auto-detect Node and run `node dist/index.js`
- **Cloudflare Workers** — swap `@hono/node-server` for Hono's CF Workers adapter

### Telling the Expo web app where the proxy is

Set `EXPO_PUBLIC_API_URL` before starting the Expo dev server:

```env
# apps/portal/.env
EXPO_PUBLIC_API_URL=https://api.yourportal.example.com
```

Defaults to `http://localhost:3001` for local development.

---

## License

Private — internal use only.
