# Upgrade Plan — v1.0 Hardening

**Scope:** Address all issues identified in the post-foundation code review of `apps/` and `packages/`.
**Goal:** Ship a production-ready 1.0 with no known security vulnerabilities, no confirmed bugs, and consistent patterns across all modules.

---

## Priority Tiers

| Tier | Label | Criteria |
|---|---|---|
| P0 | Critical | Security vulnerability or confirmed runtime crash |
| P1 | High | Incorrect behavior or data loss risk |
| P2 | Medium | Reliability, UX degradation, or maintainability debt |
| P3 | Low | Polish, consistency, developer experience |

---

## Task Index

### Phase 1 — Foundation hardening (TASK-01 to TASK-08)

| Task | Title | Tier | Status |
|---|---|---|---|
| [TASK-01](task-01-security-hardening.md) | API Security Hardening | P0 | ✅ Done |
| [TASK-02](task-02-api-reliability.md) | API Reliability & Correctness | P1 | ✅ Done |
| [TASK-03](task-03-attendance-bugs.md) | Attendance Module Bug Fixes | P0–P1 | ✅ Done |
| [TASK-04](task-04-payslip-bugs.md) | Payslip Module Bug Fixes | P1 | ✅ Done |
| [TASK-05](task-05-settings-bugs.md) | Settings Module Bug Fixes | P1 | ✅ Done |
| [TASK-06](task-06-core-cleanup.md) | Core & odoo-client Cleanup | P2 | ✅ Done |
| [TASK-07](task-07-app-shell.md) | App Shell Improvements | P2 | ✅ Done |
| [TASK-08](task-08-consistency.md) | Cross-Cutting Consistency | P2–P3 | ✅ Done |

### Phase 2 — Production readiness (TASK-09 to TASK-14)

Identified via production readiness evaluation — see [production-readiness.md](production-readiness.md).

| Task | Title | Tier | Status |
|---|---|---|---|
| [TASK-09](task-09-configuration.md) | Configuration Management | P0–P1 | ✅ Done |
| [TASK-10](task-10-bff-hardening.md) | BFF Crash Hardening | P0–P1 | ✅ Done |
| [TASK-11](task-11-dependency-security.md) | Dependency Security (CVEs) | P0 | ✅ Done |
| [TASK-12](task-12-observability.md) | Observability & Crash Reporting | P1 | ✅ Done |
| [TASK-13](task-13-ci-pipeline.md) | CI Pipeline | P1 | ✅ Done |
| [TASK-14](task-14-redis-session-store.md) | Redis Session Store | P1 | ✅ Done |

---

## Recommended Execution Order

```
Phase 1 (complete):
  TASK-01 → TASK-02 → TASK-03 → TASK-04 → TASK-05 → TASK-06 → TASK-07 → TASK-08

Phase 2 — unblock production (do before any real-user traffic):
  TASK-11 (CVEs, fastest win)
  TASK-10 (crash hardening — loginAttempts leak + fetch timeouts)
  TASK-09 (config validation — stabilises env var handling)
  TASK-13 (CI — gates all future merges)

Phase 2 — operational maturity (can run in parallel with above):
  TASK-12 (observability — logging + Sentry)
  TASK-14 (Redis — required before multi-instance or rolling deploys)
```

TASK-11 and TASK-10 contain P0 items and must ship before any production deployment.

---

## Issue Count by Package

### Phase 1

| Package | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| `apps/api` | 2 | 4 | 3 | 1 | 10 |
| `apps/portal` | 0 | 1 | 4 | 1 | 6 |
| `modules/attendance` | 1 | 3 | 0 | 0 | 4 |
| `modules/payslip` | 0 | 3 | 1 | 0 | 4 |
| `modules/settings` | 0 | 3 | 0 | 0 | 3 |
| `packages/core` | 0 | 1 | 3 | 1 | 5 |
| `packages/odoo-client` | 0 | 0 | 1 | 2 | 3 |
| Cross-cutting | 0 | 0 | 3 | 2 | 5 |
| **Phase 1 Total** | **3** | **15** | **15** | **7** | **40** |

### Phase 2

| Package | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| `apps/api` | 3 | 6 | 3 | 12 |
| `apps/portal` | 1 | 2 | 1 | 4 |
| Repo / infra | 0 | 3 | 2 | 5 |
| **Phase 2 Total** | **4** | **11** | **6** | **21** |
