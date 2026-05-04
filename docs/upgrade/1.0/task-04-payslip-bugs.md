# TASK-04 — Payslip Module Bug Fixes

**Tier:** P1
**Package:** `modules/payslip`
**Estimated effort:** 2–3 hours

---

## Background

The payslip module has a query that refetches on every render (causing visible flicker), a wage calculation heuristic that will produce wrong numbers on any non-default Odoo payroll configuration, and a dead UI element.

---

## Issues

### 04-A — `useBatchPayslipLines` refetches on every render (P1)

**File:** `modules/payslip/src/hooks.ts:36`

```typescript
export const useBatchPayslipLines = (payslips: Payslip[]) => {
  const slipIds = payslips.map((p) => p.id); // new array every render

  return useQuery({
    queryKey: ['batchPayslipLines', slipIds], // deep-equal check, but new ref
    queryFn: () => repo!.getBatchPayslipLines(slipIds),
  });
};
```

`payslips.map(p => p.id)` creates a new array reference on every render. React Query does deep equality on query keys, so this is not as bad as it sounds — but the upstream `payslips` array itself is often also a new reference each render (from `useQuery` data), meaning the deep comparison finds the same values and does **not** refetch. However, the stability depends on React Query internals and is fragile.

The correct fix is to memoize `slipIds` so the reference is stable when the underlying data has not changed.

**Fix:**

```typescript
// modules/payslip/src/hooks.ts
export const useBatchPayslipLines = (payslips: Payslip[]) => {
  const slipIds = useMemo(() => payslips.map((p) => p.id), [payslips]);

  return useQuery({
    queryKey: ['batchPayslipLines', slipIds],
    queryFn: () => repo!.getBatchPayslipLines(slipIds),
    enabled: repo !== null && slipIds.length > 0,
  });
};
```

Also add `enabled: slipIds.length > 0` to avoid a no-op query when `payslips` is empty.

---

### 04-B — `calculateNetWage` uses hardcoded category/code strings (P1)

**File:** `modules/payslip/src/screens/PayslipListScreen.tsx:39-53`

```typescript
const calculateNetWage = (lines: PayslipLine[]): number => {
  return lines
    .filter(l => ['Earnings', 'ALW'].includes(l.categoryName))
    .reduce((sum, l) => sum + l.total, 0)
  - lines
    .filter(l => ['Deduction', 'DED'].includes(l.categoryName))
    .reduce((sum, l) => sum + l.total, 0);
};
```

This filters by category names (`'Earnings'`, `'ALW'`, `'Deduction'`, `'DED'`) and line codes (`'BASIC'`, `'ALW'`, `'DED'`). These are Odoo-instance-specific strings that vary across localizations and custom payroll configurations. On any non-default configuration this will silently return `0` or a wrong number.

**Correct approach:** Use the `NET` salary rule code, which is Odoo's standard code for net wage in the default payroll structure. If `NET` is not present in the lines, fall back to `GROSS` minus deductions.

```typescript
// modules/payslip/src/screens/PayslipListScreen.tsx
const calculateNetWage = (lines: PayslipLine[]): number => {
  const netLine = lines.find((l) => l.code === 'NET');
  if (netLine) return netLine.total;

  // Fallback: GROSS minus total deductions (code 'DED' category)
  const gross = lines.find((l) => l.code === 'GROSS')?.total ?? 0;
  const deductions = lines
    .filter((l) => l.categoryCode === 'DED')
    .reduce((sum, l) => sum + l.total, 0);
  return gross - deductions;
};
```

This requires `code` and `categoryCode` to be included in `PayslipLine`. Verify these are in the field map (`mappings.ts`) and fetched by `getBatchPayslipLines`.

---

### 04-C — `useCompany` called with `companyId || 0` (P1)

**File:** `modules/payslip/src/screens/PayslipDetailScreen.tsx:18`

```typescript
const { data: company } = useCompany(companyId || 0);
```

When `companyId` is `null` or `undefined`, this passes `0` to `useCompany`. Fetching company ID `0` is an invalid Odoo record read and will produce an error or empty result. The `enabled: !!companyId` guard in `useCompany` presumably protects against this, but passing `0` is semantically wrong and leaks through if the guard is ever changed.

**Fix:**

```typescript
const { data: company } = useCompany(companyId ?? undefined);
```

Ensure `useCompany` has `enabled: companyId != null` as its guard.

---

### 04-D — Download button has no `onPress` handler (P2)

**File:** `modules/payslip/src/screens/PayslipListScreen.tsx:167`

A download `TouchableOpacity` is rendered with no `onPress`. Tapping it does nothing silently — users cannot tell if the feature is broken or unavailable.

**Fix (short-term):** Disable the button with `disabled` and a tooltip/text indicating the feature is coming, or remove it entirely.

**Fix (long-term):** Implement PDF download via the Odoo `report` endpoint and wire to `onPress`.

```tsx
// Short-term placeholder:
<TouchableOpacity
  disabled
  style={{ opacity: 0.4 }}
  accessibilityLabel="PDF download not yet available"
>
  <MaterialCommunityIcons name="download" size={20} />
</TouchableOpacity>
```

---

### 04-E — `domain: any[]` in `getPayslips` (P2)

**File:** `modules/payslip/src/repository.ts:10`

```typescript
async getPayslips(domain: any[] = []): Promise<Payslip[]>
```

The `OdooDomain` type exists in `@odoo-portal/odoo-client` precisely for this purpose.

**Fix:**

```typescript
import type { OdooDomain } from '@odoo-portal/odoo-client';

async getPayslips(domain: OdooDomain = []): Promise<Payslip[]>
```

---

## Acceptance Criteria

- [x] `useBatchPayslipLines` does not trigger a new fetch when the component re-renders with the same payslip list.
- [x] `calculateNetWage` returns the value of the `NET` salary rule line when present.
- [x] `calculateNetWage` falls back to `GROSS - deductions` when `NET` is absent.
- [x] Passing `companyId = null` to the payslip detail screen does not trigger a company ID `0` fetch.
- [x] The download button is either functional or visually disabled with an explanatory label — not a silent no-op.
- [x] `getPayslips` parameter is typed as `OdooDomain`, not `any[]`.
