# TASK-10 — BFF Crash Hardening

**Tier:** P0–P1
**Package:** `apps/api`
**Estimated effort:** 2–3 hours

---

## Background

Three specific issues in the BFF will cause it to crash or degrade under sustained traffic: an unbounded in-memory Map that grows without purging, fetch calls that have no timeout and can pile up indefinitely, and a Dockerfile that runs as root with no health-check directive. These are distinct from the session-store persistence issue (addressed in TASK-14) and the dependency CVEs (addressed in TASK-11).

---

## Issues

### 10-A — `loginAttempts` Map grows without bound (P0)

**File:** `apps/api/src/routes/auth.ts:11`

```typescript
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
```

Entries are only removed when the same IP hits the route again after its window expires. An IP that hits once and is never seen again stays in the Map permanently. Under organic mobile traffic with rotating IPs (CGNAT, VPN, mobile networks), or an IP-spoofed brute-force attempt, this Map grows without bound and will eventually exhaust the process heap.

**Fix:** Add a periodic purge identical to the session store pattern:

```typescript
// apps/api/src/routes/auth.ts — add after the Map declaration
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of loginAttempts) {
        if (now > entry.resetAt) loginAttempts.delete(ip);
    }
}, 15 * 60 * 1000).unref(); // .unref() so this timer does not prevent process exit
```

---

### 10-B — Outbound fetch calls have no timeout (P0)

**Files:** `apps/api/src/routes/auth.ts:58`, `apps/api/src/routes/proxy.ts:75`

Every call to Odoo's JSON-RPC endpoint uses a bare `fetch()` with no timeout. If Odoo is slow (database lock, large query, high load), these fetches hang indefinitely. Under concurrent traffic, hung fetches accumulate — each one holding an open TCP connection, memory for the response buffer, and a slot in the event loop. Once the heap is exhausted or the OS connection limit is hit, the process crashes or stops accepting new connections.

**Fix:** Add `AbortSignal.timeout` to every outbound fetch. `AbortSignal.timeout` is available in Node.js 17.3+ without import.

```typescript
// Proxy route — apps/api/src/routes/proxy.ts:75
odooResponse = await fetch(odooUrl, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify(rpcBody),
    signal: AbortSignal.timeout(15_000), // 15 s
});

// Auth login — apps/api/src/routes/auth.ts:58
authResponse = await fetch(odooEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
    signal: AbortSignal.timeout(15_000),
});
```

The parallel `Promise.allSettled` fetches in the auth route (lines 95–131) should each carry their own signal:

```typescript
const [readResult, versionResult] = await Promise.allSettled([
    fetch(odooEndpoint, { ..., signal: AbortSignal.timeout(10_000) }),
    fetch(odooEndpoint, { ..., signal: AbortSignal.timeout(5_000) }),
]);
```

When a timeout fires, the `fetch` rejects with `TimeoutError`. The existing `try/catch` in both routes returns a `502` to the client — no extra handling needed.

---

### 10-C — Dockerfile runs as root (P1)

**File:** `apps/api/Dockerfile`

The container runs as root. If an attacker achieves RCE through the application, they have root inside the container, which broadens the blast radius considerably (writable filesystem, capability escalation, namespace escapes depending on the runtime).

**Fix:** Add a non-root user at the end of the `deps` stage, before copying application code:

```dockerfile
# After the build stage, in the runtime stage:
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid  1001 hono

USER hono
```

---

### 10-D — No `HEALTHCHECK` in Dockerfile (P1)

**File:** `apps/api/Dockerfile`

Docker has no way to detect a deadlocked or crashed process that is still "running" from the OS perspective. Without a `HEALTHCHECK`, container orchestrators (Docker Compose, ECS, Fly.io) cannot restart an unhealthy container automatically.

**Fix:** Add a health-check directive. The `/health` endpoint already exists:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Using `node -e` instead of `curl` avoids adding a dependency.

---

### 10-E — No `.dockerignore` (P2)

**File:** `apps/api/` (missing `.dockerignore`)

Without `.dockerignore`, the Docker build context includes `node_modules`, `.env`, test files, and build artefacts. This inflates the context transfer time and risks including `.env` files with real secrets in the image layer cache.

**Fix:** Add `apps/api/.dockerignore`:

```
node_modules
.env
.env.*
!.env.example
dist
__tests__
*.test.ts
.turbo
```

---

## Acceptance Criteria

- [x] A `setInterval` with `.unref()` purges `loginAttempts` entries every 15 minutes.
- [x] Every outbound `fetch` in `auth.ts` and `proxy.ts` carries an `AbortSignal.timeout`. Timeout values: 15 s for proxy calls, 15 s for auth, 10 s / 5 s for the parallel post-auth fetches.
- [x] A timed-out Odoo fetch returns HTTP 502 to the client (not a 500 or a hang).
- [x] `Dockerfile` creates a non-root user and runs the process as that user.
- [x] `Dockerfile` includes a `HEALTHCHECK` directive using `node -e`.
- [x] `apps/api/.dockerignore` exists and excludes `node_modules`, `.env.*`, and `dist`.
