# TASK-07 — App Shell Improvements

**Tier:** P2
**Package:** `apps/portal`
**Estimated effort:** 2–3 hours

---

## Background

The app shell (`apps/portal/app/(app)/_layout.tsx`) has a layering violation (hardcoded attendance route knowledge), silently truncates the navigation when there are more than 4 modules, re-registers modules on every hot reload, and has a suppressed `react-hooks/exhaustive-deps` violation.

---

## Issues

### 07-A — App shell has hardcoded knowledge of attendance routes (P2)

**File:** `apps/portal/app/(app)/_layout.tsx:72-75`

```typescript
if (pathname.startsWith('/attendance/leave')) {
  return route.path === '/attendance/leave-list' ? route.path : bestMatch;
}
```

The app shell — which is supposed to be module-agnostic — has hardcoded awareness of the attendance module's internal route structure. This breaks the encapsulation of the module system: adding a new module should never require touching the shell.

**Fix:** Add an optional `navHighlightPattern` field to `PortalRouteConfig` that lets each module declare which URL patterns should highlight a given nav entry:

```typescript
// packages/core/src/types/module.ts
interface PortalRouteConfig {
  path:                string;
  title:               string;
  icon?:               string;
  showInNav?:          boolean;
  navHighlightPattern?: string; // regex string, e.g. "^/attendance"
}
```

The attendance module sets its own pattern:

```typescript
// modules/attendance/src/module.ts
{ path: '/attendance', navHighlightPattern: '^/attendance', showInNav: true },
```

The shell uses the pattern instead of hardcoded path logic:

```typescript
// apps/portal/app/(app)/_layout.tsx — active route resolution
const activeRoute = routes.find((route) => {
  if (!route.navHighlightPattern) return pathname === route.path;
  return new RegExp(route.navHighlightPattern).test(pathname);
});
```

---

### 07-B — Mobile tab bar silently drops modules 5 and beyond (P2)

**File:** `apps/portal/app/(app)/_layout.tsx:159`

```typescript
routes.slice(0, 4)
```

Only the first 4 nav routes are shown. If a user has access to 5 or more modules, the extras are dropped with no indicator. The user cannot discover or reach those features.

**Fix option A (recommended):** Show a "More" tab that opens a modal list of all remaining modules.

```tsx
const visibleRoutes = navRoutes.slice(0, 3);
const overflowRoutes = navRoutes.slice(3);

// Tab bar:
{visibleRoutes.map(route => <TabItem key={route.path} route={route} />)}
{overflowRoutes.length > 0 && (
  <TabItem
    label="More"
    icon="dots-horizontal"
    onPress={() => setMoreModalVisible(true)}
  />
)}
```

**Fix option B (simpler):** Make the tab bar horizontally scrollable using `ScrollView` with `horizontal`.

---

### 07-C — `ModuleRegistry.register` called at module scope — hot reload spam (P2)

**File:** `apps/portal/app/(app)/_layout.tsx:8-9`

```typescript
ModuleRegistry.register(attendanceModule);
ModuleRegistry.register(payslipModule);
```

Module-scope calls run on every hot module replacement in development. The registry's duplicate-detection logs a console warning on each reload, spamming the output during development.

**Fix:** Move all `ModuleRegistry.register` calls to the root `app/_layout.tsx`, inside a `useEffect` with an empty dependency array, or guard with an idempotency check:

```typescript
// apps/portal/app/_layout.tsx — root layout, runs once
useEffect(() => {
  ModuleRegistry.register(attendanceModule);
  ModuleRegistry.register(payslipModule);
  ModuleRegistry.register(settingsModule);
}, []);
```

Alternatively, add idempotency to `ModuleRegistry.register`:

```typescript
// packages/core/src/modules/module-registry.ts
register(registration: ModuleRegistration): void {
  if (this._modules.has(registration.module.id)) return; // silent no-op
  this._modules.set(registration.module.id, registration);
}
```

The console warning for duplicates can remain as a dev-only log, but the behavior should be a no-op, not a crash.

---

### 07-D — `SessionRestorer` suppresses `react-hooks/exhaustive-deps` (P2)

**File:** `apps/portal/app/_layout.tsx:156`

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { restoreSession(...); }, []);
```

`restoreSession` is omitted from the dependency array with an ESLint suppression. The correct fix depends on whether `restoreSession` is a stable function reference.

**Fix:** If `restoreSession` is wrapped in `useCallback` in `useAuth` (which it should be), include it in the dependency array and remove the suppression:

```typescript
useEffect(() => {
  restoreSession({ url, database });
}, [restoreSession, url, database]);
```

If `restoreSession` is not yet memoized, wrap it:

```typescript
// packages/core/src/hooks/use-auth.ts
const restoreSession = useCallback(async (config) => {
  // ...
}, [client, sessionStorage]); // stable dependencies
```

---

### 07-E — Copyright year hardcoded as "2024" (P3)

**File:** `apps/portal/src/screens/LoginScreen.tsx:158`

```tsx
<Text>© 2024 Your Company</Text>
```

**Fix:**

```tsx
<Text>© {new Date().getFullYear()} Your Company</Text>
```

Or use the build year from a constant if a runtime `Date` call is undesirable in a static screen.

---

## Acceptance Criteria

- [x] The app shell has no string references to `'attendance'`, `'leave'`, or any other module name in its active-route logic.
- [x] Modules declare their own `navHighlightPattern` in `PortalRouteConfig`.
- [x] A user with access to 5+ modules can see and navigate to all of them (horizontal scroll tab bar).
- [x] No "already registered" warnings appear in the Metro console during hot reload (idempotent register).
- [x] `SessionRestorer`'s `useEffect` has no ESLint suppression comment.
- [x] Copyright year in `LoginScreen` is dynamic.
