# Testing

Status: Phase 0 baseline, verified 2026-08-21 on this machine.

## How to run

```bash
cd frontend
npm ci            # Node 22 recommended (see "Node version caveat")
npm test          # Vitest run (unit + component tests)
npm run build     # production build must succeed
node scripts/check-locales.mjs        # locale packs parity
node scripts/check-source-strings.mjs # report-only source-string audit
npm run test:fatigue-probe           # property probe over ~108k fatigue comparisons

cd ../mcp
npm ci && npm test && npm run check:node-loadable
```

CI (`.github/workflows/test.yml`) runs all of the above on Node 22 for PRs and pushes to main.

## Current suite

* **Frontend: 21 files / 326 tests** — colocated with the code they test:
  * Pure-logic suites under `src/lib/*.test.js`: progression (policies, deloads, bodyweight),
    onerm (formulas, REP_CAP), effort (RIR/RPE aggregation), history, muscles, recovery,
    supersetFlow, strength-exercises, wakelock, guest, import (csv/effort/match), demoSeed,
    finish-workout compatibility.
  * Component/view tests under `src/views` + `src/components`: Workout session behavior,
    exercise removal from active sessions, Stats recovery view, Modals. These render with
    `linkedom` or `happy-dom` shims rather than a full browser.
* **MCP: 36 tests** (`mcp/test/tools.test.js`) + structural node-loadability check (guards
  against Vite-only imports reaching shared modules).

## Node version caveat (found during audit)

`Workout.remove.test.jsx` uses `@vitest-environment happy-dom`. Under **Node ≥ 26**, Node's
experimental global `localStorage` interferes and the file's 7 tests fail with
`localStorage` undefined. CI/Docker pin **Node 22**, where everything passes (verified:
326/326 with Node 26 + `NODE_OPTIONS="--localstorage-file=…"`, and by inspection of CI config).
Action item: add `"engines": { "node": ">=22 <23" }` / `.nvmrc` in Phase 1 to make this
constraint explicit.

## Gaps identified in audit

1. **No API tests at all** — `api/server.js` is the only untested runtime code (auth, data
   routes, admin). Highest-value next addition; needed before any auth/role work.
2. No E2E tests (workout flow is covered only by component-level tests).
3. No lint/typecheck tooling exists to wire into CI (no ESLint/Prettier/TS configs).
4. Locale checks are partially advisory (`check-source-strings.mjs` is report-only by design).

## MiGym testing policy

* Tests before refactoring any critical logic; new logic arrives with its tests.
* Critical areas per spec: progression, volume, 1RM, RIR/RPE logic, workout completion,
  authentication, authorization, persistence, sync. The first four already have inherited
  coverage; auth/authorization/persistence/sync need the API test layer (Phase 1+ follow-up).
* A feature is not complete because the UI works: unit/integration coverage is part of done.
* Never claim tests pass without running them; record actual results in phase reports.
