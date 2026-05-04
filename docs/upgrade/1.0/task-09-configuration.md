# TASK-09 — Configuration Management

**Tier:** P1
**Packages:** `apps/api`, `apps/portal`
**Estimated effort:** 2–3 hours

---

## Background

Configuration is currently read directly from `process.env` at various call sites throughout the BFF, with no schema validation and no typed contract. If a required variable is absent or malformed (e.g. `PORT=abc`), the failure is silent at boot and surfaces later as a runtime bug. The Expo app reads config through `process.env` directly, which is fragile and prevents per-environment build profiles. This task centralises configuration into validated, typed modules for both packages.

---

## Issues

### 09-A — BFF reads `process.env` at call sites with no validation (P1)

**Files:** `apps/api/src/index.ts`, `apps/api/src/middleware/cors.ts`, `apps/api/src/middleware/jwt.ts`, `apps/api/src/routes/auth.ts`

`process.env` is accessed in at least four separate files with local fallbacks (`?? '28800'`, `?? '3001'`, etc.). A missing variable silently becomes `undefined` or `NaN`, with no indication of which variable caused the problem. The manual `JWT_SECRET` check in `index.ts` is an ad-hoc partial solution.

**Fix:** Create `apps/api/src/config.ts` that validates all env vars at startup using `zod` and exports a typed `config` object:

```typescript
// apps/api/src/config.ts
import { z } from 'zod';

const schema = z.object({
    NODE_ENV:        z.enum(['development', 'production', 'test']).default('development'),
    PORT:            z.coerce.number().int().min(1).max(65535).default(3001),
    JWT_SECRET:      z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_TTL:         z.coerce.number().int().positive().default(28800),
    PORTAL_ORIGINS:  z.string().default('http://localhost:8081'),
    LOG_LEVEL:       z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SESSION_STORE_TYPE: z.enum(['memory', 'redis']).default('memory'),
    REDIS_URL:       z.string().url().optional(),
});

const result = schema.safeParse(process.env);
if (!result.success) {
    console.error('Invalid configuration:');
    for (const [field, errors] of Object.entries(result.error.flatten().fieldErrors)) {
        console.error(`  ${field}: ${errors?.join(', ')}`);
    }
    process.exit(1);
}

if (result.data.NODE_ENV === 'production' && result.data.JWT_SECRET === 'change-me-to-a-random-64-char-string') {
    console.error('FATAL: JWT_SECRET must be changed from the default value in production.');
    process.exit(1);
}

export const config = result.data;
```

All other files replace their `process.env[...]` reads with `import { config } from '../config.js'`.

The manual `JWT_SECRET` check in `index.ts` is then deleted — the config module owns that responsibility.

---

### 09-B — `apps/api/.env.example` mixes secrets with non-sensitive config (P2)

**File:** `apps/api/.env.example`

`JWT_SECRET` (a secret) and `PORT` (not sensitive) are in the same file with no distinction. This encourages copying the example into `.env` including the placeholder secret, and provides no guidance on where real secrets should come from in production.

**Fix:** Split the example file and add inline comments:

```bash
# apps/api/.env.example

# ── Non-sensitive config (can be committed per environment) ───────────────────
PORT=3001
LOG_LEVEL=info
JWT_TTL=28800
PORTAL_ORIGINS=http://localhost:8081
SESSION_STORE_TYPE=memory

# ── Secrets (must come from a secrets manager or CI environment in production) ─
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=change-me-to-a-random-64-char-string

# ── Optional: Redis (required when SESSION_STORE_TYPE=redis) ──────────────────
# REDIS_URL=redis://localhost:6379
```

---

### 09-C — Expo reads config via `process.env` at component level (P1)

**File:** `apps/portal/lib/create-client.ts` and component files

`EXPO_PUBLIC_ODOO_URL` and `EXPO_PUBLIC_ODOO_DATABASE` are read via `process.env` at runtime. Expo compiles these at build time, so there is no validation that they are set — if absent, they become the string `"undefined"` in the bundle silently.

Additionally, the app uses `app.json` (static), which means there is no way to inject different values per EAS Build environment profile without editing the file.

**Fix:** Switch to a dynamic `app.config.ts`:

```typescript
// apps/portal/app.config.ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
    const odooUrl      = process.env['EXPO_PUBLIC_ODOO_URL'];
    const odooDatabase = process.env['EXPO_PUBLIC_ODOO_DATABASE'];
    const apiUrl       = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    const appEnv       = process.env['APP_ENV'] ?? 'development';

    if (!odooUrl || !odooDatabase) {
        // Only hard-fail in production builds; allow dev with fallbacks
        if (appEnv === 'production') {
            throw new Error('EXPO_PUBLIC_ODOO_URL and EXPO_PUBLIC_ODOO_DATABASE are required for production builds.');
        }
    }

    return {
        ...config,
        name: appEnv === 'production' ? 'Odoo Portal' : `Odoo Portal (${appEnv})`,
        extra: { odooUrl, odooDatabase, apiUrl, appEnv },
    };
};
```

Add a typed accessor to replace scattered `process.env` reads:

```typescript
// apps/portal/lib/app-config.ts
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
    odooUrl: string | undefined;
    odooDatabase: string | undefined;
    apiUrl: string;
    appEnv: string;
};

export const appConfig = {
    odooUrl:      extra?.odooUrl ?? '',
    odooDatabase: extra?.odooDatabase ?? '',
    apiUrl:       extra?.apiUrl ?? 'http://localhost:3001',
    appEnv:       extra?.appEnv ?? 'development',
} as const;
```

---

### 09-D — Live Odoo credentials committed in `apps/portal/.env` (P0)

**File:** `apps/portal/.env`

The file contains a live Odoo instance URL and database name. If this repository is ever made public, or if the file is accidentally pushed, real instance details are exposed.

**Fix:**
1. Verify `.env` is listed in `.gitignore` at both the repo root and `apps/portal/` level.
2. Replace the real values in `apps/portal/.env` with placeholder values matching `.env.example`.
3. Document the actual values in the team's secrets manager (Doppler, 1Password, AWS SSM, etc.).

---

## Acceptance Criteria

- [x] `apps/api/src/config.ts` exists and validates all env vars with `zod`. Process exits with a clear per-field error message if any required variable is missing or malformed.
- [x] No file in `apps/api/src/` reads `process.env` directly except `config.ts`.
- [x] The manual `JWT_SECRET` check in `index.ts` is removed (handled by config schema).
- [x] `apps/api/.env.example` distinguishes secrets from non-sensitive config with inline comments.
- [x] `apps/portal/app.config.ts` exists and `app.json` is deleted or converted to a static-only base.
- [x] `apps/portal/lib/app-config.ts` exports a typed `appConfig` object; all component-level `process.env` reads are replaced.
- [x] `apps/portal/.env` contains no real Odoo instance URL or database name.
- [x] `git check-ignore apps/portal/.env` returns the file path (confirming it is gitignored).
