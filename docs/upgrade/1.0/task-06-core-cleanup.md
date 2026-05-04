# TASK-06 — Core & odoo-client Cleanup

**Tier:** P2–P3
**Packages:** `packages/core`, `packages/odoo-client`
**Estimated effort:** 2–3 hours

---

## Background

The two foundation packages are well-structured but have a fragile datetime utility, a type that spreads `any` into all consuming modules, a weak ID generator for toasts, a dead dependency, and insufficient test coverage on the most critical mapping function.

---

## Issues

### 06-A — `odooToDate` timezone detection is fragile (P2)

**File:** `packages/core/src/utils.ts:24-28`

```typescript
if (val.includes('-') && val.lastIndexOf('-') > 7) {
  // treat as already having timezone info
}
```

This heuristic tries to detect `+HH:MM` timezone offsets. The condition `val.lastIndexOf('-') > 7` fires for ISO date-only strings like `"2026-01-15"` where `lastIndexOf('-')` is `7` — which is excluded by `> 7`, so that particular case is safe. However, a string like `"2026-01-15T14:30:00-05:00"` has `lastIndexOf('-')` at position `19`, which would be detected correctly. But `"2026-01-15"` would not match, then would hit the Odoo branch and get `Z` appended — producing `"2026-01-15Z"`, which is not a valid ISO 8601 date-time and `new Date("2026-01-15Z")` returns `Invalid Date` in some environments.

**Root cause:** The function tries to detect the presence of timezone information using positional heuristics instead of a reliable test.

**Fix:** Use a regex to classify the input:

```typescript
export const odooToDate = (val: string | false | null | undefined): Date | null => {
  if (!val) return null;

  // Odoo datetime: "2026-01-15 14:30:00" — no timezone, stored in UTC
  // ISO with offset: "2026-01-15T14:30:00+07:00" — already has tz info
  // ISO UTC:         "2026-01-15T14:30:00Z"
  // Date-only:       "2026-01-15" — treat as UTC midnight

  const hasTimezone = /[Z]$|[+-]\d{2}:\d{2}$/.test(val);
  const hasTime = val.includes('T') || (val.includes(' ') && val.length > 10);

  if (hasTimezone) {
    return new Date(val);
  }
  if (hasTime) {
    // Odoo UTC datetime without timezone marker
    return new Date(val.replace(' ', 'T') + 'Z');
  }
  // Date-only string — treat as UTC midnight
  return new Date(val + 'T00:00:00Z');
};
```

Add unit tests covering: Odoo datetime string, ISO with positive offset, ISO with negative offset, ISO UTC (`Z`), date-only, `false`, `null`, and `undefined`.

---

### 06-B — `ScreenComponent` typed as `(props: any) => unknown` (P2)

**File:** `packages/core/src/types/module.ts:37`

```typescript
export type ScreenComponent = (props: any) => unknown;
```

This type is used for all screens registered via `loadScreens`. Using `any` means no type safety for screen props across the module boundary. The cast-to-`any` in `attendanceModule.loadScreens` is a symptom.

**Fix:** Use React's own component type, which is broad enough to accept any screen:

```typescript
import type { ComponentType } from 'react';

export type ScreenComponent = ComponentType<Record<string, unknown>>;
```

Or if prop types genuinely cannot be known at the registry level, keep `any` but document the reason:

```typescript
// Screen components are loaded dynamically; prop types are enforced at the
// call site (Expo Router route files), not at the registry level.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScreenComponent = ComponentType<any>;
```

Either way, remove the cast-to-`any` in individual `module.ts` files where it's only present to satisfy this broad type.

---

### 06-C — Toast ID uses `Math.random()` with substring (P3)

**File:** `packages/core/src/toast.ts:15`

```typescript
id: Math.random().toString(36).substring(7),
```

`Math.random().toString(36)` produces a string like `"0.4fzyo82mvyr"`. `.substring(7)` takes characters 7 onward — about 5–6 characters — from a string that always starts with `"0."`. The effective entropy is very low (roughly 2^25 ≈ 33 million combinations). Toast collision is low-risk but not zero.

**Fix:** Use a simple monotonic counter for deterministic IDs, which is also testable:

```typescript
// packages/core/src/toast.ts
let _toastCounter = 0;

const emit = (type: ToastType, title: string, message?: string): void => {
  const id = `toast-${++_toastCounter}`;
  // ...
};
```

Or `crypto.randomUUID()` for collision-proof IDs without counter reset risk.

---

### 06-D — `mapFromOdoo` has no unit tests (P2)

**File:** `packages/odoo-client/src/__tests__/field-mapper.test.ts`

`getOdooFields` has one test. `mapFromOdoo` — which handles many2one normalization, `false → null` conversion, and the core field renaming — has zero tests. This is the most critical function in the data layer.

**Fix:** Add tests covering:

| Input | Expected output |
|---|---|
| `{ employee_id: [42, "Alice"] }` with many2one field | `{ employeeId: { id: 42, name: "Alice" } }` |
| `{ check_out: false }` | `{ checkOut: null }` |
| `{ check_in: "2026-01-15 08:00:00" }` | `{ checkIn: "2026-01-15 08:00:00" }` (passthrough) |
| Unknown Odoo field not in map | Excluded from result |
| Empty raw record `{}` | `{}` |
| Nested many2one `[1, "Dept A"]` | `{ id: 1, name: "Dept A" }` |

```typescript
// packages/odoo-client/src/__tests__/field-mapper.test.ts
describe('mapFromOdoo', () => {
  it('normalizes many2one tuples to { id, name }', () => {
    const fieldMap = { employeeId: 'employee_id' };
    const raw = { employee_id: [42, 'Alice'], id: 1 };
    expect(mapFromOdoo(raw, fieldMap)).toEqual({ employeeId: { id: 42, name: 'Alice' } });
  });

  it('converts false to null', () => {
    const fieldMap = { checkOut: 'check_out' };
    expect(mapFromOdoo({ check_out: false }, fieldMap)).toEqual({ checkOut: null });
  });
  // ... more cases
});
```

---

### 06-E — `zustand` dead dependency in `packages/core` (P3)

**File:** `packages/core/package.json`

`zustand` is listed under `dependencies` but is not imported anywhere in `packages/core/src/`. The connection store may have been removed or moved to `apps/portal` in a refactor. A dead dependency adds install weight and version-conflict surface area.

**Fix:** Remove `zustand` from `packages/core/package.json`. Verify `pnpm turbo typecheck` still passes after removal.

---

## Acceptance Criteria

- [x] `odooToDate("2026-01-15")` returns a valid `Date` (not `Invalid Date`) in all tested environments.
- [x] `odooToDate` uses regex-based timezone detection; handles Odoo datetime, ISO with offset, UTC Z, and date-only strings.
- [x] `ScreenComponent` uses `ComponentType<any>` with documented justification comment.
- [x] Toast IDs use a monotonic counter `toast-N` — deterministic and collision-free.
- [x] `mapFromOdoo` has 6 unit tests covering field rename, many2one, false→null, field exclusion, absent field, and nested many2one. All 20 tests pass.
- [x] `zustand` removed from `packages/core/package.json`. Typecheck passes.
