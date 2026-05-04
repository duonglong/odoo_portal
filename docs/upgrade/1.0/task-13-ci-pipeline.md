# TASK-13 — CI Pipeline

**Tier:** P1
**Packages:** All (repo-wide)
**Estimated effort:** 2–3 hours

---

## Background

There is no automated CI pipeline. Code merges to `main` are not typechecked, tested, linted, or scanned for vulnerable dependencies before they land. The test suite (34 tests) and typecheck scripts exist and pass locally, but nothing enforces this on pull requests. A single bad merge can introduce a regression that ships to users undetected.

---

## Issues

### 13-A — No CI pipeline (P1)

**File:** `.github/workflows/` (missing)

There is no GitHub Actions (or equivalent) workflow. The absence means:
- Type errors can be merged and only discovered at runtime
- Failing tests can be merged
- New High-severity CVEs can be introduced via dependency updates without detection
- No gate prevents a developer from merging work-in-progress code

**Fix:** Add a minimal, fast CI workflow that runs on every push and pull request:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    name: Typecheck · Test · Lint · Audit
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm run typecheck

      - name: Test
        run: pnpm run test

      - name: Lint
        run: pnpm run lint

      - name: Dependency audit
        run: pnpm audit --audit-level=high
```

This workflow:
- Uses `--frozen-lockfile` to ensure the lockfile is never silently updated in CI
- Caches pnpm's store for fast subsequent runs
- Fails on any High or Critical CVE (`--audit-level=high`)
- Times out after 15 minutes to catch infinite loops in tests

---

### 13-B — No branch protection rules (P1)

**Repository settings (not a code change)**

Without branch protection, anyone with write access can push directly to `main`, bypassing the CI workflow entirely.

**Fix (GitHub repository settings):**
- Enable "Require status checks to pass before merging" on `main`
- Add the `CI / Typecheck · Test · Lint · Audit` job as a required status check
- Enable "Require branches to be up to date before merging"
- Disable "Allow force pushes" and "Allow deletions"

---

### 13-C — `pnpm-lock.yaml` may not be committed (P2)

If `pnpm-lock.yaml` is not committed (or is in `.gitignore`), `pnpm install --frozen-lockfile` will fail in CI. The lockfile must be committed to guarantee reproducible installs.

**Fix:** Verify the lockfile is tracked:
```bash
git ls-files pnpm-lock.yaml
```

If not listed, add it:
```bash
git add pnpm-lock.yaml
git commit -m "chore: track pnpm lockfile"
```

---

### 13-D — No lint script in some packages (P3)

Before CI can run `pnpm run lint` across the monorepo, every package that has a `turbo.json` task must have a matching `lint` script in its `package.json`. Packages missing the script cause Turborepo to skip them silently.

**Fix:** Audit each package's `package.json` for a `lint` script. Add the following for any that are missing:

```json
"scripts": {
  "lint": "eslint src --ext .ts,.tsx --max-warnings 0"
}
```

The `--max-warnings 0` flag treats warnings as errors, preventing warning accumulation.

---

## Acceptance Criteria

- [x] `.github/workflows/ci.yml` exists with `typecheck`, `test`, `lint`, and `pnpm audit --audit-level=high` steps.
- [x] CI runs on every push to `main` and every pull request.
- [x] `pnpm install --frozen-lockfile` passes in CI (lockfile is committed).
- [x] Branch protection is enabled on `main` with the CI job as a required status check.
- [x] All packages with source files have a `lint` script in `package.json`.
- [x] A passing CI run is verified by opening a test pull request.
