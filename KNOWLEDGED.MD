# Odoo Portal — Knowledge Base

> This file records architectural decisions, key patterns, and accumulated knowledge for the project.
> It is intended for developers and AI assistants continuing work on this codebase.

---

## 1. Project Overview

**What:** A modular, cross-platform portal for Odoo 19 built with Expo + TypeScript.

**Why:** Give mobile/web users access to Odoo features (attendance, sales, leaves, etc.) through a plug-in architecture where each feature is a self-contained module.

**Status:** Phases 1–3 complete. Foundation, core React layer, and the attendance module are implemented, type-checked (0 errors), and unit-tested (18/18 pass).

---

## 2. Architecture Layers

```
apps/portal          → Expo universal app (iOS, Android, Web)
modules/attendance   → Feature module (self-contained)
packages/core        → React providers, hooks, module registry, stores
packages/odoo-client → JSON-RPC transport, OdooClient, field mapper
packages/types       → Shared TypeScript interfaces (zero runtime deps)
```

### Dependency Rules (NEVER violate)

- `types` → imports **nothing**
- `odoo-client` → imports `types` only
- `core` → imports `types` + `odoo-client`, **never** Expo or modules
- `modules/*` → imports `types` + `odoo-client` + `core`, **never** other modules
- `apps/portal` → imports everything (it's the composition root)

---

## 3. Key Files Inventory

### packages/types
| File | Purpose |
|------|---------|
| `src/module.ts` | `PortalModule`, `PortalRouteConfig`, `ModuleRegistration` contracts |
| `src/field-map.ts` | `FieldMap` type — maps domain prop names to Odoo field names |
| `src/repository.ts` | Generic `Repository<T>` interface |
| `src/odoo.ts` | `OdooSession`, `OdooDomain`, `SearchOptions`, `AuthCredentials` |

### packages/odoo-client
| File | Purpose |
|------|---------|
| `src/odoo-client.ts` | `OdooClient` class — auth, CRUD, callKw |
| `src/json-rpc-transport.ts` | Low-level JSON-RPC 2.0 fetch wrapper |
| `src/mappers/field-mapper.ts` | `mapFromOdoo()`, `mapToOdoo()`, `getOdooFields()` |

### packages/core
| File | Purpose |
|------|---------|
| `src/providers/odoo-provider.tsx` | `OdooProvider` — React context holding OdooClient factory, caches by URL+DB |
| `src/hooks/use-auth.ts` | `useAuth()` — login, logout, restoreSession, listDatabases |
| `src/hooks/use-odoo-query.ts` | `useOdooQuery()`, `useOdooCount()` — TanStack Query wrappers |
| `src/hooks/use-odoo-mutation.ts` | `useOdooCreate/Update/Delete/Call()` — mutations with auto-invalidation |
| `src/modules/module-registry.ts` | `ModuleRegistry` singleton — stores & filters registered modules |
| `src/modules/use-modules.ts` | `useModules()` — returns modules matching current user's Odoo groups |
| `src/stores/connection-store.ts` | Zustand store for saved Odoo connections with persistence |

### modules/attendance
| File | Purpose |
|------|---------|
| `src/types.ts` | `AttendanceRecord`, `Employee`, `AttendanceAction` |
| `src/mappings.ts` | `attendanceFieldMap`, `employeeFieldMap` |
| `src/repository.ts` | `AttendanceRepository` — Odoo calls for hr.attendance + hr.employee |
| `src/hooks.ts` | `useMyEmployee()`, `useAttendanceRecords()`, `useCheckInOut()` |
| `src/screens/ClockScreen.tsx` | Check-in/out UI with live clock |
| `src/screens/HistoryScreen.tsx` | Paginated attendance history |
| `src/module.ts` | `attendanceModule` — registers with ModuleRegistry |

### apps/portal
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout — QueryClient, OdooProvider, module registration |
| `app/(auth)/login.tsx` | 2-step login: URL → database picker → credentials |
| `app/(app)/_layout.tsx` | Dynamic tab navigator from registered modules |
| `app/(app)/index.tsx` | Home screen — module cards, connection info |
| `lib/storage.ts` | Platform-specific `SessionStorage` (SecureStore / AsyncStorage) |

---

## 4. Core Patterns

### Field Mapping

Every module defines a `FieldMap` that maps clean domain names to Odoo field names. The `mapFromOdoo()` utility also handles:
- `many2one` — `[42, "John"]` → `{ id: 42, name: "John" }`
- `false` → `null`

**To customize for a client:** only change the FieldMap, zero UI changes.

### Module Registration

1. Module defines `ModuleRegistration` (metadata + lazy screen loader)
2. `apps/portal/_layout.tsx` calls `ModuleRegistry.register(module)`
3. At runtime, `useModules(userGroups)` filters by `requiredGroups`
4. Tab navigator renders only accessible modules

### Authentication Flow

1. User enters Odoo URL → app calls `listDatabases()`
2. User picks database + enters credentials (password or API key)
3. `OdooClient.authenticate()` → receives `uid`, `session_id`
4. Session persisted via `SessionStorage` (SecureStore on mobile, AsyncStorage on web)
5. On next launch, `restoreSession()` tries to resume

---

## 5. Extensibility Patterns

### Extending Modules (avoid bloat)

Split into **base + extension packages**:
```
modules/attendance/           ← base: clock, history
modules/attendance-overtime/  ← extension: depends on attendance
modules/attendance-leave/     ← extension: depends on attendance
```

Each extension registers its own `PortalModule` — the app discovers it independently.
Rule: **if it has its own Odoo model(s), make it a separate module**.

### Extending Field Mappings

| Need | How |
|------|-----|
| Add custom fields | `{ ...attendanceFieldMap, location: 'x_location' }` |
| Per-client config | Factory: `createAttendanceFieldMap(overrides)` |
| Type safety | `interface Extended extends AttendanceRecord { location: string }` |
| Rename a field | Override same key: `{ ...baseMap, checkIn: 'x_arrival_time' }` |

### Extending Screens

| Need | Pattern | Modifies base? |
|------|---------|---------------|
| Add section above/below UI | **Slots** — render props (`headerExtra`, `footerExtra`) | Yes, once |
| Add content around a screen | **Wrapper** — wrap the component | No |
| Add columns to a list | **Field registry** — runtime registry of extra fields | Yes, once |
| Replace a screen entirely | **Route replacement** — change the Expo route import | No |

---

## 6. Tech Stack

| Concern | Technology | Version |
|---------|-----------|---------|
| Language | TypeScript | strict mode |
| Cross-Platform | Expo | 52 |
| Navigation | Expo Router | v4 (file-based, typed) |
| Styling | NativeWind | v4 |
| Server State | TanStack Query | v5 |
| Client State | Zustand | v5 |
| Odoo Protocol | JSON-RPC 2.0 | via fetch |
| Build System | Turborepo + pnpm | workspaces |
| Testing | Vitest | — |

---

## 7. Known Decisions & Gotchas

1. **`mapFromOdoo` generic relaxed** — the generic was changed from `T extends Record<string, unknown>` to plain `T` so domain interfaces (without index signatures) work. The internal cast is safe.

2. **React as peerDep in core** — `packages/core` declares React as a `peerDependency`, not a direct dep. The app layer provides it.

3. **NativeWind type augmentation** — each module that uses `className` on RN components needs `nativewind` in devDependencies and a `nativewind-env.d.ts` reference file.

4. **`attendance_manual` method** — check-in/out uses `OdooClient.callKw('hr.employee', 'attendance_manual', [[employeeId], ...])`. This is a server-side method, not a standard CRUD operation.

5. **Zustand persist storage** — `createJSONStorage()` wraps the storage adapter. Pass the raw storage object, not a factory function wrapping it.

---

## 8. Planned Work (Phase 4)

- [ ] Offline caching with TanStack Query persistence adapters
- [ ] Biometric auth via `expo-local-authentication`
- [ ] Push notifications via `expo-notifications`
- [ ] Multi-instance connection switching UI
- [ ] Additional modules: Timesheet, Leave Requests
