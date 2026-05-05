# TASK-05 — Settings Module Bug Fixes

**Tier:** P1
**Package:** `modules/settings`
**Estimated effort:** 1–2 hours

---

## Background

The settings module deviates from the null-safe repository pattern established in attendance and payslip, has untyped form state, and uses unsafe catch-clause typing. These are all straightforward fixes.

---

## Issues

### 05-A — `SettingsRepository` constructed with `null` client (P1)

**File:** `modules/settings/src/hooks.ts:10`

```typescript
export const useSettingsRepo = (client: OdooClient | null) =>
  useMemo(() => new SettingsRepository(client!), [client]);
```

`client!` is a non-null assertion on a value that is legitimately `null` during session restore. `SettingsRepository` is constructed with `null` passed as `OdooClient`. Any method call on the resulting repo will crash at runtime with a null-dereference.

Compare with the correct pattern used in attendance:

```typescript
// modules/attendance/src/hooks.ts — correct pattern
const repo = useMemo(
  () => (client ? new AttendanceRepository(client) : null),
  [client],
);
```

**Fix:** Apply the same null-safe pattern to settings.

```typescript
// modules/settings/src/hooks.ts
export const useSettingsRepo = (client: OdooClient | null) =>
  useMemo(
    () => (client ? new SettingsRepository(client) : null),
    [client],
  );
```

Then update all hooks that consume the repo to guard with `enabled: repo !== null`:

```typescript
export const useProfile = (client: OdooClient | null, session: OdooSession | null) => {
  const repo = useSettingsRepo(client);
  return useQuery({
    queryKey: ['settings', 'profile', session?.uid],
    queryFn: () => repo!.getProfile(session!.uid!),
    enabled: repo !== null && session?.uid != null,
  });
};
```

---

### 05-B — Non-null assertions on `session` inside query functions (P1)

**File:** `modules/settings/src/hooks.ts:19, 31`

```typescript
queryFn: () => repo.getProfile(session!.uid!),
```

The `enabled` guard (`enabled: !!session?.uid`) prevents execution when `session` is null, but TypeScript still sees the types as potentially null inside `queryFn`. The non-null assertions are both incorrect TypeScript practice and could mask a real crash if the `enabled` guard is weakened in the future.

**Fix:** Use local variables with proper type narrowing:

```typescript
export const useProfile = (client: OdooClient | null, session: OdooSession | null) => {
  const repo = useSettingsRepo(client);
  const uid = session?.uid;
  return useQuery({
    queryKey: ['settings', 'profile', uid],
    queryFn: () => repo!.getProfile(uid!), // repo and uid are both defined when enabled
    enabled: repo !== null && uid != null,
  });
};
```

Or extract a helper that accepts narrowed types to eliminate the assertions entirely.

---

### 05-C — `formData` typed as `any` in `ProfileScreen` (P1)

**File:** `modules/settings/src/screens/ProfileScreen.tsx:17`

```typescript
const [formData, setFormData] = useState<any>({});
```

`UserProfile` is already defined and imported. Using `any` defeats the TypeScript compiler for the entire form, meaning field name typos, missing fields, and wrong value shapes all pass type-checking silently.

**Fix:**

```typescript
import type { UserProfile } from '../types.js';

const [formData, setFormData] = useState<Partial<UserProfile>>({});
```

`Partial<UserProfile>` is appropriate for a form that is progressively filled. After this change, fix any resulting type errors that were previously hidden by `any`.

---

### 05-D — `catch (e: any)` in mutation handlers (P1)

**File:** `modules/settings/src/screens/ProfileScreen.tsx:59, 83, 113`

```typescript
} catch (e: any) {
  toast.error('Update failed', e.message);
}
```

TypeScript's strict mode defaults catch bindings to `unknown`. Using `any` bypasses null checking — if `e` is not an `Error` object (e.g., it's a string thrown by a library), `e.message` is `undefined` and the toast shows nothing useful.

**Fix:**

```typescript
} catch (e) {
  const message = e instanceof Error ? e.message : 'Unknown error';
  toast.error('Update failed', message);
}
```

Apply to all three catch blocks in the file.

---

### 05-E — `updateProfile` passes partial object just to carry an ID (P2)

**File:** `modules/settings/src/screens/ProfileScreen.tsx:54`

```typescript
stateId: formData.stateId ? { id: formData.stateId, name: '' } : null,
```

The `name: ''` placeholder is constructed purely to satisfy the `{ id: number; name: string }` type before `SettingsRepository.updateProfile` extracts `.id`. This is a leaky abstraction.

**Fix:** Change `updateProfile` to accept `stateId: number | null` and `countryId: number | null` directly, rather than the full many2one shape. The repository method is the only consumer of these values, so the interface change is self-contained.

```typescript
// modules/settings/src/repository.ts
interface UpdateProfileInput {
  stateId:   number | null;
  countryId: number | null;
  // ...other fields
}
```

---

## Acceptance Criteria

- [x] `useSettingsRepo` returns `null` when `client` is `null`. No `SettingsRepository(null!)` ever constructed.
- [x] All settings queries have `enabled: repo !== null && uid != null`. No non-null assertions in `queryFn` bodies.
- [x] `formData` is typed as `UpdateProfileData` (flat IDs). TypeScript catches field name typos in the form.
- [x] All three catch blocks use `e instanceof Error` narrowing.
- [x] `updateProfile` accepts `UpdateProfileData` with flat `stateId: number | null` — no more `{ id, name: '' }` wrapping.
