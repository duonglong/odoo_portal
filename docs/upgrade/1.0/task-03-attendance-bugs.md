# TASK-03 — Attendance Module Bug Fixes

**Tier:** P0–P1
**Package:** `modules/attendance`
**Estimated effort:** 3–4 hours

---

## Background

The attendance module is the most mature feature in the codebase but has a broken type contract, a date-range bug that affects non-UTC timezones, and production-facing UI that renders hardcoded mock data.

---

## Issues

### 03-A — `attendanceState` missing from field map — always `undefined` (P0)

**Files:**
- `modules/attendance/src/types.ts:51` — field declared in `Employee` type
- `modules/attendance/src/mappings.ts:18-23` — field absent from `employeeFieldMap`

`attendanceState: 'checked_in' | 'checked_out'` is declared on the `Employee` interface but `attendance_state` is never included in `employeeFieldMap`. After `mapFromOdoo`, the field is always `undefined` — the type contract is silently broken.

The `useIsCheckedIn` hook works around this with a separate `hr.attendance` query, adding an unnecessary round-trip on every clock screen render.

**Fix:**
1. Add `attendanceState: 'attendance_state'` to `employeeFieldMap` in `mappings.ts`.
2. Update `useIsCheckedIn` to derive its value from `employee.attendanceState` instead of the extra query.

```typescript
// modules/attendance/src/mappings.ts
export const employeeFieldMap: FieldMap = {
  id:              'id',
  name:            'name',
  jobTitle:        'job_title',
  department:      'department_id',
  image:           'image_128',
  attendanceState: 'attendance_state', // ADD THIS
};
```

```typescript
// modules/attendance/src/hooks.ts — simplify useIsCheckedIn
export const useIsCheckedIn = (employee: Employee | null | undefined): boolean =>
  employee?.attendanceState === 'checked_in';
```

---

### 03-B — `getMonthAttendance` uses local time for UTC date range (P1)

**File:** `modules/attendance/src/repository.ts:58-61`

```typescript
const start = new Date(year, month - 1, 1);
const end   = new Date(year, month, 0, 23, 59, 59);
```

`new Date(year, month - 1, 1)` constructs a date in the **device's local timezone**. On a UTC+7 device, the first day of the month starts 7 hours into midnight UTC — meaning `toISOString()` produces the previous calendar day's date. Odoo stores `check_in`/`check_out` in UTC, so the domain filter will miss records from the first few hours of the month.

**Fix:** Use `Date.UTC` to construct boundary dates explicitly in UTC.

```typescript
// modules/attendance/src/repository.ts
const startUtc = new Date(Date.UTC(year, month - 1, 1));
const endUtc   = new Date(Date.UTC(year, month, 1));  // exclusive upper bound

const domain: OdooDomain = [
  ['employee_id', '=', employeeId],
  ['check_in',   '>=', startUtc.toISOString()],
  ['check_in',   '<',  endUtc.toISOString()],
];
```

Using an exclusive `<` upper bound with the first day of the next month avoids the 23:59:59 approximation, which misses any record in the last second of the month.

Apply the same UTC fix to any other date range in the repository that uses `new Date(year, month, ...)` — verify `getLeaveHistory` and `getTeamUpcomingLeaves` as well.

---

### 03-C — Hardcoded mock data visible to users in `LeaveRequestScreen` (P1)

**File:** `modules/attendance/src/screens/LeaveRequestScreen.tsx`

Two blocks of hardcoded placeholder content are rendered to real users:

1. **Line 193:** `"You are requesting 5 working days off."` — the number `5` is hardcoded. It should be calculated from `startDate` and `endDate` (excluding weekends and public holidays, or at minimum calendar days).

2. **Lines 356–376:** A "mini week calendar" with hardcoded dates `19–25` and hardcoded conflict text `"High conflict on Nov 20-22."` — this data is completely fabricated and does not reflect any real query result.

**Fix for 193:** Calculate working days between `startDate` and `endDate`.

```typescript
// Simple calendar-day count (refine with business-day logic as needed)
const dayCount = startDate && endDate
  ? Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000))
  : 0;

// Render:
<Text>{`You are requesting ${dayCount} day${dayCount !== 1 ? 's' : ''} off.`}</Text>
```

**Fix for 356–376:** Either:
- Wire to a real `useTeamUpcomingLeaves` query and render actual conflicts, or
- Remove the section entirely until the data layer is ready — do not show fabricated conflict information to users.

---

### 03-D — Leave date boundary uses JavaScript overflow behavior (P2)

**File:** `modules/attendance/src/repository.ts:159-165`

```typescript
const endMonthDay = new Date(filters.year, filters.month ?? 12, 0);
```

`new Date(year, 12, 0)` relies on JavaScript's date overflow: day 0 of month 13 wraps to December 31. This is correct but non-obvious and fragile if the arguments are ever changed.

**Fix:** Use explicit UTC construction for clarity:

```typescript
const endMonthDay = filters.month
  ? new Date(Date.UTC(filters.year, filters.month, 0))   // last day of filters.month
  : new Date(Date.UTC(filters.year, 12, 0));              // Dec 31
```

Add a comment explaining the day-0 trick if retained.

---

### 03-E — `getTeamUpcomingLeaves` mutates a `const` date (P3)

**File:** `modules/attendance/src/repository.ts:211`

```typescript
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7); // mutation of const
```

This works but is surprising. Prefer:

```typescript
const nextWeek = new Date(Date.now() + 7 * 86_400_000);
```

---

## Acceptance Criteria

- [x] `Employee.attendanceState` is fetched from Odoo and correctly populated after `mapFromOdoo` (verify in a real device/emulator session).
- [x] `useIsCheckedIn` no longer makes a separate `hr.attendance` query.
- [x] `getMonthAttendance` on a UTC+7 device returns records for day 1 of the month.
- [x] `LeaveRequestScreen` shows a dynamically calculated day count.
- [x] No hardcoded dates or conflict text are visible in `LeaveRequestScreen`.
- [x] `getLeaveHistory` and `getTeamUpcomingLeaves` date ranges also use UTC construction.

## Implementation Notes

- `attendanceState: 'attendance_state'` added to `employeeFieldMap` — field was declared in `Employee` type but never fetched.
- `useIsCheckedIn` is now a plain function `(employee) => boolean` instead of a React Query hook — eliminates a redundant `hr.attendance` round-trip on every clock screen render. Callers updated in `AttendanceModuleCard` and `AttendanceSummaryScreen`. The stale `['attendance', 'is_checked_in']` invalidation in `useCheckInOut.onSuccess` was removed.
- All date ranges (`getMonthAttendance`, `getMyLeaveRequests`, `getTeamUpcomingLeaves`) now use `Date.UTC(...)` — fixes off-by-one day on UTC+ devices.
- `getTeamUpcomingLeaves` no longer mutates a `const` date object.
- Mock mini-calendar (hardcoded dates 19–25, "High conflict on Nov 20-22") removed entirely. Day count in the info alert is now computed from `startDate`/`endDate` state (inclusive).
