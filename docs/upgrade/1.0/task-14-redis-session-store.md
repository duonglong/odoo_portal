# TASK-14 — Redis Session Store

**Tier:** P1
**Package:** `apps/api`
**Estimated effort:** 3–4 hours

---

## Background

The BFF session store is a process-local `Map`. Every restart, PM2 reload, or container replacement silently invalidates all active sessions — users receive a 401 "Session not found" and must log in again. This is acceptable for a single-instance dev server but is a hard blocker for production, where:
- Container orchestrators restart containers as part of normal operation (rolling deploys, health-check failures, node recycling)
- Horizontal scaling requires session state to be accessible from all instances

The `session-store.ts` file already has a `SESSION_STORE_TYPE=redis` stub comment. This task implements that stub.

---

## Issues

### 14-A — Sessions lost on every process restart (P1)

**File:** `apps/api/src/session-store.ts`

The in-memory `Map` is process-local. Any restart loses all sessions.

**Fix:** Implement a `RedisSessionStore` that satisfies the same interface as the current store. The implementation is selected at startup via `SESSION_STORE_TYPE`:

**Step 1 — Extract an interface:**

```typescript
// apps/api/src/session-store.ts

export interface ISessionStore {
    get(jti: string): Promise<StoredSession | undefined> | StoredSession | undefined;
    set(jti: string, session: StoredSession): Promise<void> | void;
    delete(jti: string): Promise<void> | void;
}
```

Make the existing `SessionStore` class implement `ISessionStore`. Since it is synchronous, the interface types are compatible.

**Step 2 — Implement `RedisSessionStore`:**

```typescript
// apps/api/src/session-store-redis.ts
import { createClient } from 'redis';
import type { ISessionStore, StoredSession } from './session-store.js';
import { config } from './config.js';

const client = createClient({ url: config.REDIS_URL });
client.on('error', (err) => console.error('[redis] client error', err));

export const connectRedis = () => client.connect();

export class RedisSessionStore implements ISessionStore {
    private prefix = 'session:';

    async get(jti: string): Promise<StoredSession | undefined> {
        const raw = await client.get(this.prefix + jti);
        if (!raw) return undefined;
        const session = JSON.parse(raw) as StoredSession;
        if (Date.now() > session.expiresAt) {
            await client.del(this.prefix + jti);
            return undefined;
        }
        return session;
    }

    async set(jti: string, session: StoredSession): Promise<void> {
        const ttlMs = session.expiresAt - Date.now();
        if (ttlMs <= 0) return;
        await client.set(
            this.prefix + jti,
            JSON.stringify(session),
            { PX: ttlMs }, // expire at the same time as the JWT
        );
    }

    async delete(jti: string): Promise<void> {
        await client.del(this.prefix + jti);
    }
}
```

**Step 3 — Select the store at startup:**

```typescript
// apps/api/src/session-store.ts
import { config } from './config.js';

export let sessionStore: ISessionStore;

if (config.SESSION_STORE_TYPE === 'redis') {
    const { RedisSessionStore, connectRedis } = await import('./session-store-redis.js');
    await connectRedis();
    sessionStore = new RedisSessionStore();
} else {
    sessionStore = new MemorySessionStore();
}
```

**Step 4 — Update proxy and auth routes** to `await` the now-async `get`, `set`, and `delete` calls. Since `ISessionStore` methods return `Promise | T`, use `await` in all call sites — the `MemorySessionStore` returns synchronously but wrapping a sync value with `await` is a no-op.

---

### 14-B — No local development environment with Redis (P2)

**File:** root (missing `docker-compose.yml`)

There is no `docker-compose.yml` for local development. Developers who want to test `SESSION_STORE_TYPE=redis` have no reference setup, and a future Redis dependency means onboarding a new developer now requires manual Redis installation.

**Fix:** Add `docker-compose.yml` at the repo root:

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      PORT: 3001
      JWT_SECRET: dev-only-change-me-in-production
      SESSION_STORE_TYPE: redis
      REDIS_URL: redis://redis:6379
      PORTAL_ORIGINS: http://localhost:8081
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

Add `redis` as a dev dependency:

```bash
pnpm --filter @odoo-portal/api add redis
```

---

### 14-C — Session store interface not testable (P2)

The current `sessionStore` is exported as a module-level singleton, which makes unit testing routes that call `sessionStore.get()` impossible without mocking the module. The interface extracted in 14-A enables dependency injection:

```typescript
// In tests
const mockStore: ISessionStore = {
    get: vi.fn().mockResolvedValue({ uid: 1, ... }),
    set: vi.fn(),
    delete: vi.fn(),
};
```

Pass `mockStore` to route factories in tests instead of relying on the global singleton.

---

## Acceptance Criteria

- [x] `ISessionStore` interface is exported from `session-store.ts`.
- [x] `MemorySessionStore` implements `ISessionStore` (existing code, just made to implement the interface).
- [x] `RedisSessionStore` implements `ISessionStore` using the `redis` npm package.
- [x] When `SESSION_STORE_TYPE=redis`, the BFF connects to Redis on startup and uses `RedisSessionStore`.
- [x] When `SESSION_STORE_TYPE=memory` (default), behaviour is unchanged from the current implementation.
- [x] A failed Redis connection at startup logs an error and exits (do not silently fall back to memory in production).
- [x] `docker-compose.yml` at repo root starts `api` + `redis` with a health check. `docker compose up` produces a working BFF.
- [x] `REDIS_URL` is documented in `apps/api/.env.example` (commented out, with a note that it is required when `SESSION_STORE_TYPE=redis`).
