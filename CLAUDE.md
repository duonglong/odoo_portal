# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install
pnpm install                        # install all workspace deps

# Type checking & tests
pnpm turbo typecheck                # strict TS check across all packages
pnpm turbo test                     # run Vitest across all packages

# Run the portal app
cd apps/portal && pnpm start        # Expo dev server (w=web, a=android, i=ios)
cd apps/portal && pnpm start --clear  # clear Metro cache after dep changes

# Run the BFF proxy (separate terminal)
cd apps/api && pnpm dev             # hot-reload with tsx watch
cd apps/api && pnpm build && node dist/index.js  # production

# Scaffold a new module
pnpm new-module <slug> "Display Name"   # generates modules/<slug>/ boilerplate

# Docker (BFF + Redis)
docker compose up
```

## Architecture

Turborepo + pnpm monorepo with strict layer rules:

```
apps/portal        ← Expo universal app (iOS, Android, Web)
apps/api           ← Hono BFF proxy (resolves web CORS, holds Odoo session)
packages/core      ← React providers, hooks, ModuleRegistry, PortalModule types
packages/odoo-client ← JSON-RPC transport, OdooClient, field mapper, base types
```

**Layer dependency rule — each layer only imports from layers below it:**

| Layer | Can import | Cannot import |
|-------|-----------|--------------|
| `odoo-client` | nothing | React, UI |
| `core` | `odoo-client` | Expo, modules |
| `apps/portal` | everything | — |

**The data flow golden rule:**
```
Screens → Hooks → Repository → OdooClient
```
Screens call hooks. Hooks wrap repositories with TanStack Query. Repositories do all Odoo calls. Nothing skips a layer.

## Key Patterns

### Field Mapping
Odoo field names are snake_case and vary per installation. Every module defines a `FieldMap` that decouples domain types from Odoo internals:

```typescript
// modules/*/src/mappings.ts
export const myFieldMap: FieldMap = {
  checkIn: 'check_in',      // camelCase domain → snake_case Odoo
  employeeId: 'employee_id',
};
// In repository: raw.map(r => mapFromOdoo<MyType>(r, myFieldMap))
```
To adapt to a custom Odoo instance, change only the FieldMap — no UI changes needed.

### Module System
Modules are self-registering plugins. Each module in `modules/*/src/module.ts` exports a `ModuleRegistration` with a `PortalModule` descriptor and a lazy `loadScreens()`. The app shell calls `ModuleRegistry.register(module)` in `apps/portal/app/_layout.tsx`. Tabs are auto-discovered based on the user's Odoo groups (`requiredGroups`).

### BFF Proxy
The web build routes all Odoo JSON-RPC calls through `apps/api` (Hono server) to avoid CORS. Mobile builds can call Odoo directly. The proxy authenticates with Odoo, stores the session server-side, and issues JWTs to portal clients.

## Adding a New Module

1. Scaffold: `pnpm new-module <slug> "Name"` creates `modules/<slug>/` with all boilerplate.
2. Fill in 4 TODOs: domain types in `types.ts`, field names in `mappings.ts`, model constant in `repository.ts`, groups/models in `module.ts`.
3. Add `"@odoo-portal/<slug>": "workspace:*"` to `apps/portal/package.json` dependencies, then `pnpm install`.
4. Register in `apps/portal/app/_layout.tsx`: `ModuleRegistry.register(myModule)`.
5. Create Expo Router entry point: `apps/portal/app/(app)/<slug>.tsx` that re-exports the screen.

## Common Pitfalls

- **Missing workspace dep**: Every `@odoo-portal/*` package imported in `apps/portal` must be listed in `apps/portal/package.json`. Add it and run `pnpm install` from root.
- **NativeWind className errors**: Any package using `className` needs `nativewind-env.d.ts` at its root (`/// <reference types="nativewind/types" />`) and that file listed in `tsconfig.json` → `include`.
- **Deep path imports fail**: Module packages expose only their barrel (`src/index.ts`). Never import `@odoo-portal/foo/src/screens/Bar` — add the export to `index.ts` instead.
- **Vitest exits 1 with no tests**: Use `"test": "vitest run --passWithNoTests"` in package.json.

## Environment Variables

`apps/portal/.env` (copy from `.env.example`):
```env
EXPO_PUBLIC_ODOO_URL=http://localhost:8069
EXPO_PUBLIC_ODOO_DATABASE=odoo
EXPO_PUBLIC_API_URL=http://localhost:3001
```

`apps/api/.env` (copy from `.env.example`):
```env
JWT_SECRET=<random-string-32+-chars>   # required
PORTAL_ORIGINS=http://localhost:8081    # comma-separated allowed origins
PORT=3001
SESSION_STORE_TYPE=memory               # or "redis" (set REDIS_URL too)
```

## Tech Stack

TypeScript strict · Expo + Expo Router v4 · NativeWind v4 (Tailwind) · TanStack Query v5 · Zustand v5 · Hono (BFF) · Vitest · Turborepo + pnpm workspaces
