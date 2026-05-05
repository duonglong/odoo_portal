# TASK-02 — API Reliability & Correctness

**Tier:** P1–P2
**Package:** `apps/api`
**Estimated effort:** 2–3 hours

---

## Background

Beyond the security gaps in TASK-01, the BFF proxy has several correctness and reliability issues: duplicate JTIs on restart, per-request env var parsing, silent 500 errors, and a session store that evaporates on process restart.

---

## Issues

### 02-A — JTI collision on process restart (P1)

**File:** `apps/api/src/middleware/jwt.ts:63`

```typescript
let _tokenCounter = 0;
// jti = `${Date.now()}-${++_tokenCounter}`
```

`_tokenCounter` is a module-level integer that resets to `0` on every process restart. If two tokens are issued within the same millisecond window immediately after a restart, they produce the same `jti` — the second login silently overwrites the first session in the store.

**Fix:** Use `crypto.randomUUID()` for the `jti`. It is available in Node.js 14.17+ and Cloudflare Workers without import.

```typescript
// apps/api/src/middleware/jwt.ts
import { randomUUID } from 'node:crypto';

export const signToken = (uid: number): string => {
  const jti = randomUUID();
  return jwt.sign({ sub: String(uid), jti }, JWT_SECRET, { expiresIn: JWT_TTL });
};
```

Remove `_tokenCounter` entirely.

---

### 02-B — CORS origin list parsed on every request (P2)

**File:** `apps/api/src/middleware/cors.ts:12-13`

```typescript
const allowed = (process.env.PORTAL_ORIGINS ?? 'http://localhost:8081')
  .split(',')
  .map((o) => o.trim());
```

This string split runs inside the request handler, meaning it executes on every single request. For an env var that never changes at runtime this is pure waste.

**Fix:** Parse once at module load time.

```typescript
// apps/api/src/middleware/cors.ts
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  (process.env.PORTAL_ORIGINS ?? 'http://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

export const corsMiddleware = createMiddleware(async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  if (ALLOWED_ORIGINS.has(origin)) {
    // set headers...
  }
  await next();
});
```

---

### 02-C — No global error handler — unhandled throws return empty 500 (P1)

**File:** `apps/api/src/index.ts`

Hono's default unhandled error response is a plain-text `"Internal Server Error"` with no JSON body. All portal clients expect JSON (`{ error: { message: string } }`). An unexpected throw in any route handler currently breaks the client's JSON parsing.

**Fix:** Register a Hono `onError` handler that returns structured JSON for all unhandled errors.

```typescript
// apps/api/src/index.ts
app.onError((err, c) => {
  console.error('[api] unhandled error', err);
  return c.json(
    { error: { message: err.message ?? 'Internal server error' } },
    500,
  );
});
```

---

### 02-D — `serverVersion` hardcoded as `'unknown (jsonrpc)'` (P2)

**File:** `apps/api/src/routes/auth.ts:145`

The `serverVersion` field in the session object propagated to the client is always `'unknown (jsonrpc)'`. The app shell displays this string in the sidebar header. It's trivially fixable — Odoo's version is returned by the standard `common.version` RPC call, which is already made during authentication.

**Fix:** Call `common.version` during login and include the result in the session.

```typescript
// apps/api/src/routes/auth.ts — inside the login handler, after authenticate()
const versionInfo = await odooRpc(url, 'common', 'version', [], {});
const serverVersion: string = versionInfo?.server_version ?? 'unknown';
```

Then include `serverVersion` in the JWT payload or the login response body.

---

### 02-E — In-memory SessionStore does not survive process restart (P2)

**File:** `apps/api/src/session-store.ts`

All authenticated sessions live in a `Map` that is lost on every restart, PM2 reload, or Docker container replacement. Users are silently logged out with a 401 "Session not found" on their next request.

**Fix (short-term):** Document this behavior explicitly in the `README` and `session-store.ts` with a comment explaining the consequence. Add a `SESSION_STORE_TYPE` env var stub so a Redis adapter can be plugged in later without API changes.

**Fix (long-term):** Implement a `RedisSessionStore` that satisfies the same `SessionStore` interface and is selected when `SESSION_STORE_TYPE=redis`.

```typescript
// apps/api/src/session-store.ts
// SHORT-TERM: comment
// NOTE: Sessions are stored in-memory. All sessions are lost on process restart.
// To persist sessions across restarts, set SESSION_STORE_TYPE=redis and
// configure REDIS_URL. See docs/upgrade/1.0/task-02-api-reliability.md.

// LONG-TERM interface:
interface SessionStore {
  get(jti: string): SessionEntry | undefined;
  set(jti: string, entry: SessionEntry): void;
  delete(jti: string): void;
}
```

---

## Acceptance Criteria

- [x] Two logins within the same millisecond on a freshly restarted process produce distinct `jti` values.
- [x] `PORTAL_ORIGINS` is parsed exactly once at module load. No `.split()` inside request handlers.
- [x] Any unhandled error in any route returns `{ "error": { "message": "..." } }` with status 500.
- [x] The login response includes the actual Odoo `server_version` string (e.g. `"19.0"`), not `"unknown"`.
- [x] `session-store.ts` has a comment documenting restart behavior and a `SESSION_STORE_TYPE` env var stub.

## Implementation Notes

- 02-A was already resolved during TASK-01 when `signToken` was refactored to use `crypto.randomUUID()`.
- 02-B: `ALLOWED_ORIGINS` is now a `ReadonlySet<string>` built at module load; `FALLBACK_ORIGIN` is also pre-computed. Lookup is O(1) instead of O(n) linear scan.
- 02-C: `app.onError` registered before `notFound` in `index.ts`; logs the full error and returns `{ error: { message } }`.
- 02-D: `search_read` and `common.version` are now fetched in parallel via `Promise.allSettled`. Version failure is non-fatal — falls back to `'unknown'`.
- 02-E: Short-term fix only (comment + stub). Redis adapter deferred to long-term work.
