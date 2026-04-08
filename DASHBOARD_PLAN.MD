# Dashboard Screen — Implementation Plan

> **Goal:** Replace the current static placeholder dashboard (`apps/portal/app/(app)/index.tsx`) with a **role-based, data-driven** home screen. Each user sees only the widgets relevant to their Odoo groups — a sales user sees sales KPIs, a delivery user sees delivery data, an HR user sees attendance.

---

## Design Reference

![Dashboard mockup](/home/long/.gemini/antigravity/brain/6bc557a1-1eb4-4279-a9aa-9e1906c88cf3/dashboard_full_view_1772697597745.png)

---

## Core Principle: Role-Based Dashboard

The existing module system already solves role filtering:

```
Module.requiredGroups ──→ ModuleRegistry.getAccessible(userGroups) ──→ Only matching modules shown
```

The dashboard applies the **same mechanism** for widgets. Each module optionally exports a `DashboardWidget` alongside its `ModuleRegistration`. The dashboard auto-discovers and renders only the widgets the user has access to.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Dashboard Screen                                                    │
│                                                                      │
│  1. Greeting:  "Welcome back, {name}"                                │
│  2. Metrics:   Only from modules the user has access to              │
│  3. Modules:   Only cards for accessible modules (already works)     │
│  4. Activity:  Only events from accessible modules                   │
│                                                                      │
│  HR user sees:     [Hours Today] [Attendance %] [Attendance card]    │
│  Sales user sees:  [Monthly Sales] [Pipeline] [Sales card]           │
│  Both sees:        All of the above                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Current State

| What | Status |
|------|--------|
| `index.tsx` has the layout structure | ✅ Done, but all values are `—` placeholders |
| Module cards use `useModules()` | ✅ Already role-filtered |
| Metric cards | ❌ Hardcoded 4 cards, no real data |
| Recent Activity | ❌ Static rows with `—` values |
| Dashboard widget contract | ❌ Does not exist |

---

## Proposed Changes

### Phase 1: Dashboard Widget Contract

#### [MODIFY] `packages/types/src/module.ts`

Add a `DashboardWidget` interface and extend `ModuleRegistration`:

```typescript
/** A widget that a module contributes to the dashboard */
export interface DashboardWidget {
    /** Unique widget ID, e.g. 'attendance-hours-today' */
    id: string;
    /** Display order — lower number = shown first */
    order: number;
    /** The metric card component (shown in the top KPI row) */
    MetricCard?: ScreenComponent;
    /** Quick info card component (shown in the module cards section) */
    ModuleCard?: ScreenComponent;
}

// Extend ModuleRegistration:
export interface ModuleRegistration {
    module: PortalModule;
    loadScreens: () => Promise<Record<string, ScreenComponent>>;
    /** Optional dashboard widgets — auto-discovered by the dashboard */
    dashboardWidgets?: DashboardWidget[];
}
```

This follows the existing pattern: modules declare what they contribute, the app shell discovers it.

---

### Phase 2: Attendance Module Exports Dashboard Widgets

#### [MODIFY] `modules/attendance/src/module.ts`

Add `dashboardWidgets` to the attendance module registration:

```typescript
export const attendanceModule: ModuleRegistration = {
    module: { /* ... existing config ... */ },
    loadScreens: async () => { /* ... */ },
    dashboardWidgets: [
        {
            id: 'attendance-hours-today',
            order: 10,
            MetricCard: AttendanceHoursMetric,
        },
        {
            id: 'attendance-module-card',
            order: 10,
            ModuleCard: AttendanceModuleCard,
        },
    ],
};
```

#### [NEW] `modules/attendance/src/widgets/AttendanceHoursMetric.tsx`

A small component that:
- Calls `useAuth()` + `useMyEmployee()` + `useAttendanceRecords()`
- Computes total worked hours today
- Renders the "Hours Today" KPI card (e.g. "06:42")

#### [NEW] `modules/attendance/src/widgets/AttendanceModuleCard.tsx`

A component that:
- Shows check-in status ("Checked in at 9:00 AM" / "Not checked in")
- Shows shift or current session duration
- "OPEN MODULE →" action link (navigating to `/attendance`)

---

### Phase 3: Dashboard Screen Becomes Fully Dynamic

#### [MODIFY] `apps/portal/app/(app)/index.tsx`

Replace hardcoded cards with auto-discovered widgets:

```tsx
export default function HomeScreen() {
    const { session } = useAuth();
    const modules = useModules();          // already role-filtered

    // Collect all dashboard widgets from accessible modules
    const metricWidgets = modules
        .flatMap(m => m.dashboardWidgets ?? [])
        .filter(w => w.MetricCard)
        .sort((a, b) => a.order - b.order);

    const moduleCards = modules
        .flatMap(m => m.dashboardWidgets ?? [])
        .filter(w => w.ModuleCard)
        .sort((a, b) => a.order - b.order);

    return (
        <ScrollView>
            {/* Greeting */}
            <Text>Welcome back, {session?.name?.split(' ')[0]}</Text>

            {/* Metrics — only widgets from modules the user can access */}
            <View className="flex-row flex-wrap gap-4">
                {metricWidgets.map(w => <w.MetricCard key={w.id} />)}
            </View>

            {/* Module cards — dynamic per role */}
            <View className="flex-row flex-wrap gap-4">
                {moduleCards.map(w => <w.ModuleCard key={w.id} />)}
            </View>

            {/* Recent Activity — future: each module contributes events */}
        </ScrollView>
    );
}
```

**Result:** A sales user who only has `sale.group_sale_salesman` sees zero attendance widgets. An HR user who only has `hr_attendance.group_hr_attendance` sees zero sales widgets. A manager with both groups sees everything.

---

### Phase 4 (Future, no code now): Other Modules Add Widgets

When `modules/sales` is built, it follows the same pattern:

```typescript
export const salesModule: ModuleRegistration = {
    module: {
        requiredGroups: ['sales_team.group_sale_salesman'],
        // ...
    },
    dashboardWidgets: [
        { id: 'sales-monthly', order: 20, MetricCard: SalesMonthlyMetric },
        { id: 'sales-card',    order: 20, ModuleCard: SalesModuleCard },
    ],
};
```

No changes to the dashboard screen. It auto-discovers.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/types/src/module.ts` | **MODIFY** | Add `DashboardWidget` interface, extend `ModuleRegistration` |
| `modules/attendance/src/widgets/AttendanceHoursMetric.tsx` | **NEW** | KPI card: hours worked today |
| `modules/attendance/src/widgets/AttendanceModuleCard.tsx` | **NEW** | Module quick-info card with check-in status |
| `modules/attendance/src/module.ts` | **MODIFY** | Add `dashboardWidgets` array |
| `modules/attendance/src/index.ts` | **MODIFY** | Export new widget components |
| `apps/portal/app/(app)/index.tsx` | **MODIFY** | Replace hardcoded cards with dynamic widget discovery |

---

## How Role Filtering Works (end to end)

```
1. User logs in → session.uid stored
2. _layout.tsx calls useUserGroups(client)
   → fetches user's Odoo group XML IDs (e.g. ['hr_attendance.group_hr_attendance'])
3. useModules(userGroups) filters ModuleRegistry
   → only modules matching user's groups returned
4. Dashboard iterates modules[].dashboardWidgets
   → only renders widgets from accessible modules
5. Each widget self-contains its own data hooks
   → no cross-module imports needed
```

**The dashboard itself has zero knowledge of attendance, sales, or any domain.**
It's purely a renderer of discovered widgets.

---

## Decisions Needed

> [!IMPORTANT]
> **1. Clock In/Out directly from the dashboard card?**
> The attendance `ModuleCard` widget could include a "Clock In" button, or it can just say "OPEN MODULE →". Your preference?

> [!IMPORTANT]
> **2. "Recent Activity" section — keep or defer?**
> This requires each module to contribute an `ActivityItem[]` hook. We could defer this to a later iteration and just show the greeting + metrics + module cards for now. Or implement it for attendance-only initially.

> [!IMPORTANT]
> **3. Empty state when user has no module access?**
> If a user has no modules, the dashboard is blank. Should we show an "Ask your admin for access" message, or is this unlikely in practice?

---

## Verification Plan

### Automated

```bash
pnpm turbo typecheck     # Must pass with 0 errors (types contract change + new widgets)
pnpm turbo test          # Existing tests must stay green
```

### Manual Testing

1. **Start dev server:** `cd apps/portal && pnpm start`, press `w`
2. **Login as HR user** (has `hr_attendance.group_hr_attendance`)
   - Dashboard should show: "Hours Today" metric + Attendance module card
   - No sales/inventory cards visible
3. **Login as user with no attendance access**
   - Dashboard should show no attendance widgets
4. **Resize browser** below 768px → verify metric cards wrap to 2 columns, module cards stack
5. **Verify "Hours Today"** matches real attendance data from Odoo backend
