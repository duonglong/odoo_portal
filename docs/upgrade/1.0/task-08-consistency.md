# TASK-08 — Cross-Cutting Consistency

**Tier:** P2–P3
**Packages:** All modules, `packages/core`
**Estimated effort:** 2–3 hours

---

## Background

Several patterns are inconsistently applied across modules. These inconsistencies don't cause bugs today but create maintenance friction, make code review harder, and will cause bugs as the codebase grows. This task standardizes the three most impactful patterns.

---

## Issues

### 08-A — Null-safe repository creation pattern is inconsistent (P2)

**Scope:** All modules

The correct pattern (attendance, payslip) is:

```typescript
const repo = useMemo(
  () => (client ? new MyRepository(client) : null),
  [client],
);
return useQuery({ ..., enabled: repo !== null });
```

The settings module uses `new SettingsRepository(client!)` instead (fixed in TASK-05). But there is no documented, enforced convention — the next module author may repeat the mistake.

**Fix:**
1. Add a shared utility to `packages/core` that encapsulates the pattern:

```typescript
// packages/core/src/hooks/use-repository.ts
export const useRepository = <T>(
  client: OdooClient | null,
  factory: (client: OdooClient) => T,
): T | null =>
  useMemo(() => (client ? factory(client) : null), [client, factory]);
```

Usage in any module:

```typescript
const repo = useRepository(client, (c) => new AttendanceRepository(c));
```

2. Document the pattern in `README.md` under the "Module Guide" section.

---

### 08-B — Query key naming is inconsistent across modules (P2)

**Scope:** All modules

Current naming varies:
- Attendance: `['attendance', 'employee', uid]`
- Payslip: `['payslips', userId]`
- Settings: `['settings', 'profile', uid]`

There is no shared convention. Cross-module cache invalidation (e.g., a leave approval invalidating the payslip summary) would require knowing the exact key structure of another module, creating hidden coupling.

**Fix:** Establish and document a key convention:

```
[module-id, resource-name, ...discriminators]
```

| Before | After |
|---|---|
| `['payslips', userId]` | `['payslip', 'list', userId]` |
| `['batchPayslipLines', slipIds]` | `['payslip', 'lines', slipIds]` |
| `['attendance', 'records', employeeId]` | `['attendance', 'records', employeeId]` (already correct) |
| `['settings', 'profile', uid]` | `['settings', 'profile', uid]` (already correct) |

Add a `QUERY_KEYS` constant object to each module's `hooks.ts` barrel to make keys discoverable:

```typescript
// modules/payslip/src/hooks.ts
export const QUERY_KEYS = {
  list:  (userId: number) => ['payslip', 'list', userId] as const,
  lines: (slipIds: number[]) => ['payslip', 'lines', slipIds] as const,
} as const;
```

---

### 08-C — Sales module scaffold should not be on `main` (P2)

**Directory:** `modules/sales/`

The sales module is a scaffold with `TODO` stubs throughout. It is registered in `(app)/_layout.tsx` (verify) and appears in the nav if the user has `sales_team.group_sale_salesman`. The module icon is a raw emoji string rather than a `MaterialCommunityIcons` name, which will break the icon renderer.

**Fix (short-term):** Remove `modules/sales` registration from the app shell until implementation is complete. Do not delete the scaffold — move it to a `feature/sales` branch.

**Fix (long-term):** Implement the sales module per TASK-03 guidance, then re-register.

---

### 08-D — No tests for `packages/core` (P2)

**File:** `packages/core/`

`vitest run --passWithNoTests` means zero tests in `packages/core` passes CI silently. The core package includes non-trivial logic: `odooToDate`, `ModuleRegistry`, `useAuth` state machine, and `useModules` memoization. These should be tested.

**Priority test targets:**

| File | What to test |
|---|---|
| `utils.ts` | `odooToDate` (covered in TASK-06) |
| `modules/module-registry.ts` | `register`, `getAll`, duplicate detection, `filterByGroups` |
| `hooks/use-auth.ts` | Login success, login failure, logout, session restore |
| `toast.ts` | Subscribe, emit, unsubscribe, ID uniqueness |

Start with `ModuleRegistry` (pure, no React) and `utils.ts` since they have no external dependencies and are easy to unit test.

---

### 08-E — `SavedConnection` type defined but never used (P3)

**File:** `packages/odoo-client/src/types/connection.ts:44-53`

`SavedConnection` is fully defined but there is no connection store, no UI for switching connections, and no persistence of connection history anywhere in the app. The type exists in the public API surface of `odoo-client`.

**Fix:** Either:
- Move `SavedConnection` to `packages/core` or `apps/portal` where it belongs (closer to the feature that would use it), or
- Remove it and re-add when the multi-connection feature is actually built.

The type being in `odoo-client` implies it is part of the protocol layer, but connection management is an application concern.

---

### 08-F — `AuthenticationError` imported but never thrown in `odoo-client` (P3)

**File:** `packages/odoo-client/src/odoo-client.ts:13`

`AuthenticationError` is imported but `authenticate()` never throws it — transport errors propagate as-is. The `useAuth` hook in `packages/core` re-wraps non-`AuthenticationError` errors, making the class effectively unreachable from the calling code.

**Fix:** Either:
- Catch transport errors in `authenticate()` and wrap them as `AuthenticationError`, making the type meaningful, or
- Remove the import and the `AuthenticationError` wrapping logic in `useAuth`, letting the raw error propagate.

Option A is preferable because it gives callers a stable error type to check against.

```typescript
// packages/odoo-client/src/odoo-client.ts
async authenticate(url: string, db: string, login: string, password: string) {
  try {
    return await this.transport.authenticate(url, db, login, password);
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    throw new AuthenticationError(err instanceof Error ? err.message : 'Authentication failed');
  }
}
```

---

## Acceptance Criteria

- [x] `useRepository` utility exists in `packages/core` and is used in `usePayslips` and `useCompany`.
- [x] All module query keys follow `[module-id, resource, ...discriminators]` convention.
- [x] Each module exports a `QUERY_KEYS` constant.
- [x] `modules/sales` is not registered in the app shell on `main`. Type error fixed (removed `widgets`, fixed emoji icon).
- [x] `packages/core` has 14 unit tests covering `ModuleRegistry` (6) and `utils.ts` / `odooToDate` (8). All passing.
- [x] `SavedConnection` removed from `packages/odoo-client` (no consumers anywhere).
- [x] `authenticate()` wraps all transport errors as `AuthenticationError`, giving callers a stable error type.
