# TASK-01 — API Security Hardening

**Tier:** P0 (must fix before any public deployment)
**Package:** `apps/api`
**Estimated effort:** 2–3 hours

---

## Background

The BFF proxy (`apps/api`) holds Odoo credentials server-side and issues JWTs to clients. Three security gaps undermine this model: an unauthenticated session-drop endpoint, credential exposure via query parameters, and a committed default secret.

---

## Issues

### 01-A — Unauthenticated logout drops any session (P0)

**File:** `apps/api/src/middleware/jwt.ts:79`, `apps/api/src/routes/auth.ts:161`

`jtiFromToken` calls `jwt.decode` (no signature verification) to extract the `jti` before deleting the session from the store. The logout route does **not** require `jwtMiddleware`. This means any client can:

1. Craft a JSON payload `{ jti: "<target-jti>" }` — or simply call with any arbitrary jti.
2. `POST /auth/logout` with a forged `Authorization: Bearer <unsigned-token>`.
3. The store deletes the session matching that jti, logging out any victim user.

**Fix:**
- Add `jwtMiddleware` to the logout route so the token is verified before the `jti` is trusted.
- Replace `jwt.decode` with `jwt.verify` inside `jtiFromToken`, or inline the verify call in the logout handler.
- After verifying, assert that `payload.jti` matches a session whose `uid` equals `payload.sub` before deleting.

```typescript
// apps/api/src/routes/auth.ts — logout handler
app.post('/auth/logout', jwtMiddleware, async (c) => {
  const payload = c.get('jwtPayload'); // already verified by middleware
  if (payload.jti) {
    sessionStore.delete(payload.jti);
  }
  return c.json({ ok: true });
});
```

---

### 01-B — JWT exposed via query parameter (P0)

**File:** `apps/api/src/middleware/jwt.ts:33-35`

The middleware accepts tokens via `?token=<jwt>` in the URL. Query parameters are:
- Logged by every reverse proxy, CDN, and web server access log.
- Stored in browser history and `Referrer` headers.
- Visible in server-side analytics.

No code in `apps/portal` uses this path. There is no documented use case.

**Fix:** Remove the query-parameter fallback entirely. Keep only the `Authorization: Bearer` header path.

```typescript
// Remove these lines from jwtMiddleware:
const tokenFromQuery = c.req.query('token');
const token = tokenFromHeader ?? tokenFromQuery;

// Replace with:
const token = tokenFromHeader;
```

---

### 01-C — Default JWT secret committed to repository (P1)

**File:** `apps/api/.env`

The production `.env` file (not `.env.example`) is committed with:
```
JWT_SECRET=change-me-to-a-random-64-char-string
```

Anyone deploying the repo without changing this value is running with a publicly known signing secret — JWTs signed with it can be forged by anyone who has read the repo.

**Fix:**
1. Add `apps/api/.env` to `.gitignore` (verify it is not already tracked).
2. Rename to `.env.example` and remove any real secrets.
3. Add a startup assertion that `JWT_SECRET !== 'change-me-to-a-random-64-char-string'` and throw in production.
4. Rotate the secret for any existing deployment.

```typescript
// apps/api/src/index.ts — startup guard
if (
  process.env.NODE_ENV === 'production' &&
  process.env.JWT_SECRET === 'change-me-to-a-random-64-char-string'
) {
  throw new Error('JWT_SECRET must be changed from the default before running in production.');
}
```

---

### 01-D — No rate limiting on login endpoint (P1)

**File:** `apps/api/src/routes/auth.ts`

`POST /auth/login` forwards credentials directly to Odoo with no throttling. An attacker can use the proxy as a credential-stuffing relay against the Odoo instance.

**Fix:** Add request-level rate limiting using `hono-rate-limiter` or a simple in-memory token bucket keyed on `req.ip`.

```bash
pnpm add hono-rate-limiter
```

```typescript
// apps/api/src/routes/auth.ts
import { rateLimiter } from 'hono-rate-limiter';

const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,                  // 10 attempts per window per IP
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
});

app.post('/auth/login', loginLimiter, async (c) => { ... });
```

---

### 01-E — No request size limit on proxy endpoint (P2)

**File:** `apps/api/src/routes/proxy.ts`

The proxy forwards any JSON body to Odoo with no size cap. A client could send megabytes of `kwargs`, causing memory pressure or triggering Odoo's own request limits in an uncontrolled way.

**Fix:** Add a body size limit in Hono middleware before the proxy route.

```typescript
import { bodyLimit } from 'hono/body-limit';

app.use('/proxy/*', bodyLimit({ maxSize: 1 * 1024 * 1024 })); // 1 MB
```

---

## Acceptance Criteria

- [x] `POST /auth/logout` requires a valid, signature-verified JWT. Forged tokens are rejected with 401.
- [x] No endpoint accepts `?token=` query parameter.
- [x] `apps/api/.env` is not tracked by git. `.env.example` exists with placeholder values.
- [x] Startup throws if `JWT_SECRET` equals the default value in production.
- [x] `POST /auth/login` returns 429 after 10 attempts within 15 minutes from the same IP.
- [x] Proxy endpoint rejects bodies larger than 1 MB with 413.

## Implementation Notes

- `signToken` now returns `{ token, jti }` so the caller never needs `jwt.decode` on a token it just created. `jtiFromToken` was removed entirely.
- JTI uses `crypto.randomUUID()` (Node built-in) — no counter reset risk on restart.
- Rate limiter is a simple in-memory sliding-window map; resets on restart (acceptable for single-process). Keyed on `x-forwarded-for` → `x-real-ip` → `'unknown'`.
- Body limit uses Hono's built-in `hono/body-limit` — no extra dependency.
