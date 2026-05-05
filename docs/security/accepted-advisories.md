# Accepted Security Advisories

Last reviewed: 2026-04-24

This document records security advisories that have been evaluated and accepted as low-risk for this project. All High and Critical advisories have been resolved. The advisories below are Moderate severity and exist only in development/build tooling — not in any production runtime.

---

## Accepted (Moderate — dev tooling only)

### uuid — Buffer bounds check in v3/v5/v6

| Field | Value |
|-------|-------|
| Advisory | GHSA-w5hq-g745-h8pq |
| Package | `uuid@8.3.2` |
| Path | `@expo/cli` → `@expo/rudder-sdk-node` → `@expo/bunyan` → `uuid` |
| Used in | Dev-time CLI tooling only (`expo start`, `expo build`) |
| Runtime exposure | None — `uuid` is never called with attacker-controlled buffer sizes in this path |
| Fix available | `uuid ≥ 14.0.0`, but `@expo/cli` has not updated its transitive dependency |
| Action | Accept. Will be resolved when Expo SDK upgrades its CLI dependency. |

---

## Resolved (previously High/Critical)

| Advisory | Package | Fixed version | Method |
|----------|---------|---------------|--------|
| GHSA-92pp-h63x-v22m | `hono` (auth bypass) | 4.12.14 | Direct upgrade |
| GHSA-q5qw-h33p-qvwr | `hono` (serveStatic file read) | 4.12.14 | Direct upgrade |
| GHSA-wc8c-qw6v-h7f6 | `@hono/node-server` (static path bypass) | 1.19.10 | pnpm override |
| GHSA-f269-vfmq-vjvj | `undici` (WebSocket overflow) | 6.24.0 | pnpm override |
| GHSA-34x7-hfp2-rc4v | `tar` (hardlink traversal) | 7.5.8 | pnpm override |
| GHSA-8qq5-rm4j-mr97 | `tar` (symlink overwrite) | 7.5.8 | pnpm override |
| GHSA-83g3-92jg-28cx | `tar` (hardlink target escape) | 7.5.8 | pnpm override |
| — | `node-forge` | 1.4.0 | pnpm override |
| — | `@xmldom/xmldom` | 0.8.13 | pnpm override |
| — | `picomatch` | 2.3.2 | pnpm override |
| — | `vite` | 7.3.2 | pnpm override |
