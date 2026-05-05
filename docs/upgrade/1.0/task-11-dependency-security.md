# TASK-11 — Dependency Security

**Tier:** P0
**Packages:** `apps/api`, root
**Estimated effort:** 1–2 hours

---

## Background

`pnpm audit` reports 51 vulnerabilities. Two of them are High-severity CVEs in `hono` that directly affect the BFF: an authorization bypass via encoded path segments and an arbitrary file read via `serveStatic`. A third family of High-severity CVEs is in the `tar` package pulled in transitively by `@expo/cli`. These must be resolved before production deployment.

---

## Issues

### 11-A — Hono authorization bypass CVE (P0)

**Package:** `hono` (installed 4.7.4 via `apps/api/package.json`; transitive 4.12.3)
**CVEs:** GHSA-92pp-h63x-v22m (encoded-slash auth bypass), GHSA-q5qw-h33p-qvwr (`serveStatic` arbitrary file read)
**Safe version:** ≥ 4.12.14

The encoded-slash bypass (GHSA-92pp-h63x-v22m) allows a request with a percent-encoded path segment (e.g. `/proxy%2Fjsonrpc`) to bypass route-level middleware guards, including the JWT middleware on the proxy router. An unauthenticated client could potentially reach the proxy handler without a valid token.

**Fix:**

```bash
# Update hono in apps/api
pnpm --filter @odoo-portal/api update hono@latest
```

Verify the installed version after update:

```bash
pnpm --filter @odoo-portal/api list hono
```

Then run `pnpm audit --audit-level=high` and confirm the hono advisories are resolved.

---

### 11-B — `tar` path-traversal CVEs (P0)

**Package:** `tar@6.2.1` (transitive via `@expo/cli`)
**CVEs:** GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx (hardlink path traversal / symlink file overwrite)
**Safe version:** ≥ 7.5.8

These CVEs allow a maliciously crafted archive to overwrite arbitrary files outside the extraction directory. While `tar` is a dev-time dependency (used by `@expo/cli` for archive extraction during builds), it still represents a supply-chain risk if build systems are targeted.

**Fix:** Pin `tar` to a safe version via pnpm overrides in the root `package.json`:

```json
// package.json (root)
{
  "pnpm": {
    "overrides": {
      "tar": "^7.5.8"
    }
  }
}
```

After adding the override, run `pnpm install` to regenerate the lockfile, then verify:

```bash
pnpm list tar --depth=10 | grep tar
```

---

### 11-C — No `pnpm audit` in CI (P1)

**File:** none (missing)

Neither of the CVEs above would have blocked a merge because there is no automated dependency audit in CI. New vulnerabilities introduced by a dependency upgrade would also go undetected until the next manual audit.

**Fix:** Add `pnpm audit --audit-level=high` as a required step in the CI pipeline (see TASK-13). The `--audit-level=high` flag fails the build only on High or Critical severity, keeping the signal-to-noise ratio acceptable.

If specific advisories are accepted as low-risk (e.g., a dev-only tool with no exploitable path), document them with:

```bash
# pnpm audit --audit-level=high --ignore-registry-errors
```

Or add an `.npmrc` / `pnpm-workspace.yaml` `auditConfig.ignoreCves` list once pnpm supports it.

---

### 11-D — No audit documentation for accepted risks (P2)

Several Moderate-severity advisories (e.g., `uuid@8.3.2` via Expo) may be unexploitable given how the package is used. Without documentation, a future developer cannot tell which advisories have been evaluated and accepted versus which have never been reviewed.

**Fix:** Create `docs/security/accepted-advisories.md` listing each accepted advisory with:
- Advisory ID (GHSA-*)
- Package and version range
- Why it is not exploitable in this context
- Who accepted it and when

---

## Acceptance Criteria

- [x] `pnpm --filter @odoo-portal/api list hono` shows version ≥ 4.12.14.
- [x] `pnpm audit --audit-level=high` reports zero High or Critical vulnerabilities.
- [x] Root `package.json` has a `pnpm.overrides.tar` entry pinned to `^7.5.8`.
- [x] `pnpm list tar --depth=10` shows no version below 7.5.8.
- [x] `pnpm audit --audit-level=high` is a required step in CI (see TASK-13).
- [x] `docs/security/accepted-advisories.md` exists and documents any remaining Moderate advisories that are evaluated and accepted.
