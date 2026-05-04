# TASK-12 — Observability

**Tier:** P1
**Packages:** `apps/api`, `apps/portal`
**Estimated effort:** 3–4 hours

---

## Background

The BFF currently logs nothing about individual requests — no method, path, status code, or duration. Auth failures are silent. Errors in the portal app are visible only via the global toast handler, not captured to any external system. In production, diagnosing an incident requires either guessing or adding logging after the fact. This task adds structured request logging to the BFF and lays the foundation for client-side crash reporting.

---

## Issues

### 12-A — No per-request logging on the BFF (P1)

**File:** `apps/api/src/index.ts`

The BFF has no request logging middleware. After a production incident, there is no way to reconstruct which routes were called, what status codes were returned, or how long requests took.

**Fix:** Add a structured logging middleware registered before all routes. Use JSON format so output can be parsed by log aggregators (Datadog, CloudWatch, Loki, etc.):

```typescript
// apps/api/src/middleware/logger.ts
import { createMiddleware } from 'hono/factory';
import { config } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const log = (level: LogLevel, msg: string, data?: Record<string, unknown>) => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(config.LOG_LEVEL)) return;
    console[level === 'debug' ? 'log' : level](
        JSON.stringify({ level, msg, ...data, ts: new Date().toISOString() }),
    );
};

export const requestLogger = createMiddleware(async (c, next) => {
    const start = Date.now();
    await next();
    log('info', 'request', {
        method: c.req.method,
        path:   c.req.path,
        status: c.res.status,
        ms:     Date.now() - start,
    });
});
```

Register before all routes in `index.ts`:

```typescript
app.use('*', corsMiddleware);
app.use('*', requestLogger); // add this line
```

The existing `console.log` in `proxy.ts:74` should be replaced with `log('debug', 'proxy', { odooUrl, model, method })` — debug level so it can be silenced in production by setting `LOG_LEVEL=info`.

---

### 12-B — Auth failures are not logged (P1)

**File:** `apps/api/src/routes/auth.ts`

Failed login attempts, rate-limit rejections, and invalid tokens are returned to the client but never logged server-side. This makes it impossible to detect brute-force attacks or diagnose auth issues without client-side cooperation.

**Fix:** Add log statements at each failure path in the login handler:

```typescript
// Rate limit hit
log('warn', 'auth.rate_limited', { ip });

// Invalid credentials (Odoo returned uid=false)
log('warn', 'auth.invalid_credentials', { ip, login, odooUrl });

// Successful login
log('info', 'auth.login_success', { uid, login, odooUrl });

// Logout
log('info', 'auth.logout', { uid: c.get('jti') });
```

Do not log passwords. Do not log the full IP if privacy regulations apply (truncate to /24 subnet for IPv4).

---

### 12-C — No crash reporting integration (P1)

**Files:** `apps/portal/app/_layout.tsx`, `apps/api/src/index.ts`

Runtime crashes and uncaught exceptions in the portal app are not captured to any external service. The global query error handler shows a toast but does not forward errors to a monitoring system. In production, the first indication of a crash wave is user reports, not an automated alert.

**Fix — BFF (Node.js):** Add `process.on` handlers at startup in `index.ts`:

```typescript
process.on('uncaughtException', (err) => {
    log('error', 'uncaught_exception', { message: err.message, stack: err.stack });
    // Optionally: notify Sentry, then exit
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    log('error', 'unhandled_rejection', {
        message: reason instanceof Error ? reason.message : String(reason),
    });
});
```

**Fix — Portal app (React Native):** Integrate `@sentry/react-native`:

```bash
pnpm --filter @odoo-portal/portal-app add @sentry/react-native
```

```typescript
// apps/portal/app/_layout.tsx — at the top of the file, before any other import
import * as Sentry from '@sentry/react-native';

Sentry.init({
    dsn: process.env['EXPO_PUBLIC_SENTRY_DSN'],
    environment: process.env['APP_ENV'] ?? 'development',
    enabled: process.env['APP_ENV'] === 'production',
    tracesSampleRate: 0.2,
});
```

Wrap the root `_layout` export:

```typescript
export default Sentry.wrap(RootLayout);
```

Add `EXPO_PUBLIC_SENTRY_DSN` to `.env.example` with a placeholder value.

If Sentry is not available, a lighter alternative is to hook into the global error handler in `_layout.tsx` and `POST` the error to a logging endpoint, but a managed service is strongly preferred for production.

---

### 12-D — No React Error Boundary (P2)

**File:** `apps/portal/app/_layout.tsx`

A JavaScript render error (null dereference in JSX, unexpected data shape from a type-unsafe cast) propagates up the React tree and crashes the entire application shell. TanStack Query's error handling only catches errors inside `queryFn` — it does not protect against render-phase exceptions.

**Fix:** Add an `ErrorBoundary` class component and wrap the navigator:

```typescript
// apps/portal/src/components/ErrorBoundary.tsx
import React, { type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<{ children: ReactNode }, State> {
    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(err: unknown): State {
        return { hasError: true, message: err instanceof Error ? err.message : 'Unknown error' };
    }

    render() {
        if (this.state.hasError) {
            return (
                <View className="flex-1 items-center justify-center p-8">
                    <Text className="text-lg font-semibold mb-2">Something went wrong</Text>
                    <Text className="text-sm text-gray-500 mb-6">{this.state.message}</Text>
                    <Pressable onPress={() => this.setState({ hasError: false, message: '' })}>
                        <Text className="text-blue-500">Try again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}
```

Wrap the root layout body with `<ErrorBoundary>`.

---

## Acceptance Criteria

- [x] Every request to the BFF produces a JSON log line with `method`, `path`, `status`, `ms`, and `ts` fields.
- [x] `LOG_LEVEL=debug` shows proxy model/method. `LOG_LEVEL=info` (default) does not.
- [x] Failed login attempts log a `warn` entry with IP and login (no password).
- [x] Successful logins log an `info` entry with `uid` and `odooUrl`.
- [x] `uncaughtException` and `unhandledRejection` are logged as `error` in the BFF.
- [x] `@sentry/react-native` is installed and `Sentry.init` is called in `apps/portal/app/_layout.tsx` (enabled only in production).
- [x] Root layout is wrapped with `Sentry.wrap`.
- [x] An `ErrorBoundary` component exists and wraps the navigator in `_layout.tsx`.
