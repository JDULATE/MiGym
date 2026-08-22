# MiGym — Agent Context

> **Every coding agent MUST read this file before modifying any code.**
> Last updated: Phase 3 (Workout System Polish), 2026-08-22.

## Project identity

* **Name:** MiGym
* **Base:** fork of [openGym](https://gitea.com/DuarteSantos/openGym) by Duarte Santos (AGPL-3.0-or-later)
* **What it is:** an open-source, self-hostable fitness platform: workout tracking, routine
  management, progression, analytics; later cloud hosting, coaching and gym features.
* **What it is not:** a rewrite of openGym. MiGym is an incremental evolution of the existing codebase.

## Product vision

Help users create routines, run guided workouts, track sets/reps/weight/RIR/RPE/rest,
personal records, progression, volume, body measurements; later adapt training from history,
add an AI Coach (on top of deterministic rules), coach client management, hosted cloud, and
gym-oriented features. The self-hosted Community edition stays genuinely useful forever.
See [PRODUCT.md](PRODUCT.md).

## Current technology stack (inherited from openGym)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Vite 8 (JSX, no TypeScript) | HashRouter, Zustand stores |
| State | `frontend/src/store/useStore.js` (data+sync), `useUI.js` (timers/sheets/toasts) | single state object `S`, persisted to localStorage, synced to server |
| Business logic | pure functions in `frontend/src/lib/*.js` | progression, 1RM, effort, fatigue/recovery, muscles, history, import |
| Backend | Node 22 (`api/server.js`, single file, **no framework**) | only deps: `@simplewebauthn/server`, `web-push` |
| Storage | JSON files under `./data` | `db.json` (users/creds/subs/invites), `state-<uid>.json`, `secret`, `vapid.json` |
| Auth | WebAuthn passkeys only; HMAC-signed session cookie (`uid:exp:sv`) | no passwords anywhere |
| Serving | nginx (`web/`) serves built SPA + proxies `/api` on one origin | required by passkeys |
| PWA | `manifest.json` + runtime-caching service worker + Web Push | installable, offline media |
| Mobile | Capacitor build (`VITE_MOBILE=1`), Android APK sideloaded | no backend at all in that flavor |
| MCP | optional read-only stdio MCP server (`mcp/`) reusing frontend lib helpers | lets an LLM read your data locally |
| Tests | Vitest — 326 frontend tests colocated with lib/views, 36 MCP tests; CI also runs a fatigue property probe | see docs/TESTING.md |
| Deploy | Docker Compose (api + web + one-time media fetch) | prebuilt images at ghcr.io |

## Current phase

**PHASE 9 — AI Coach: COMPLETE.**
Next phase requires explicit authorization: **PHASE 10 — Cloud Architecture**.

## Completed phases

* Phase 0 — Repository audit (this document set).
* Phase 1 — MiGym Foundation (branding/metadata; see CHANGELOG).
* Phase 2 — Fitness Profile (`S.profile` + append-only `S.measurements`, `lib/profile.js`,
  Settings UI, demo seed, all-pack translations). See docs/DATA_MODEL.md.
* Phase 3 — Workout System Polish: per-exercise session notes (seeded from routines,
  mirrored back, preserved in history); everything else on the spec checklist verified as
  already present.
* Phase 4 — Progression Engine Isolation: `frontend/src/lib/engine/` public API barrel
  (progression/strength/effort/fatigue/deload/volume), new warmup-aware pure volume module,
  multi-session trajectory tests (all four policies + determinism/immutability invariants),
  API documented in docs/API.md. Behavior-preserving; bodies stay in lib/*.js so views and
  MCP keep stable import paths — future code consumes the engine barrel only.
* Phase 5 — Analytics: `lib/analytics.js` (trainingSummary + exerciseMomentum with explicit
  thresholds) + "Progress overview" card in Stats answering the five spec questions;
  volume math from the engine. All-pack translations complete.
* Phase 6 — Exercise Library: `lib/exercise-taxonomy.js` derives movement groups (push/
  pull/legs/core/cardio), equipment-class tags and a documented difficulty heuristic from
  existing dataset fields (1,322/1,324 placed); Library gains movement-group filter chips;
  detail sheets gain type/difficulty tags and ranked Alternatives. Compound-vs-isolation
  intentionally NOT provided (not honestly derivable). No new dataset content authored.
* Phase 7 — Routine Builder: Target RIR per exercise (stored + shown in-session, not yet
  enforced by the engine), per-exercise rest override honored by the session flow, starter
  template picker (PPL / Upper-Lower / Full Body) with tests; configs stay byte-identical
  unless new fields are set.
* Phase 8 — Adaptive Training: `lib/adaptive.js` deterministic suggestions (increase/ease/
  review/adhere) each with explanation templates; rendered under *Adjustments* in the Stats
  progress-overview card. Read-only over history; consumes rirTarget from Phase 7;
  thresholds are named constants. Nothing stored or auto-applied.
* Phase 9 — AI Coach: `lib/coach.js` bounded facts/computed context builder, guardrailed
  system prompt (labelled answers, no invention, no medicine, subordinate to deterministic
  rules), OpenAI-compatible transport via plain fetch. Settings provider card (endpoint/
  model/key in a dedicated localStorage key OUTSIDE S — never synced or backed up);
  "Ask" chat sheet in Stats. Opt-in + local-first per ADR-0004: works in guest mode and
  the mobile build; without a configured endpoint the coach does not exist.

## Planned phases

1 → Foundation/branding · 2 → Fitness profile · 3 → Workout system polish ·
4 → Progression engine isolation · 5 → Analytics · 6 → Exercise library ·
7 → Routine builder · 8 → Adaptive training · 9 → AI Coach (deterministic rules first) ·
10 → Cloud architecture · 11 → Coach platform · 12 → Gym platform ·
13 → Commercial services · 14 → Deployment hardening. See [ROADMAP.md](ROADMAP.md).
Phases are implemented strictly sequentially; never mix phases without authorization.

## Important architectural decisions

Recorded in [docs/DECISIONS/](docs/DECISIONS/). Summary:

* **ADR-0001** — MiGym is a fork of openGym and inherits **AGPL-3.0-or-later**. The license is a
  hard constraint: any network service running modified code must offer its source to users
  (AGPL §13). This shapes every future commercial phase.
* **ADR-0002** — Keep the inherited stack (React/Vite/Zustand, framework-less Node API, JSON
  storage, Docker Compose). No microservices/Redis/Kubernetes/etc.
* **ADR-0003** — No new dependencies without documented justification (license, size, necessity).
* Workout business logic lives in pure functions under `frontend/src/lib/` with colocated tests;
  keep it that way so it stays testable and reusable (the MCP server already imports it).
* Progression must stay deterministic and explainable; an AI layer may never override it.
* Training data is append-only in spirit: never silently delete workouts/sets/measurements.

## Protected functionality (do not regress)

* Passkey auth incl. "sign out everywhere" (session-version bump), guest mode semantics (#42),
  invite-only signup.
* Guided workout flow: today's session detection, weight prefill from last session, rest timer,
  warm-up rows excluded from all statistics, supersets (planned + mid-session), timed/cardio
  modes, bodyweight & per-side logging, RIR/RPE per set.
* Progression policies (off/linear/greyskull/double/time) with explainable `why` strings,
  deloads, bodyweight rep/set progression.
* Estimated 1RM (Epley default, REP_CAP=12), PR detection.
* Muscle map (balance/fatigue/strength), activity heatmap, stats views.
* Import/export: FitNotes/Strong/Hevy CSV, Apple Health bodyweight, JSON export/import,
  plan share files.
* Sync model: debounced whole-state PUT, `_ts` last-write-wins with dirty flag; active workout
  never leaves the device (`PUT /api/data` strips it server-side too).
* Push notifications: VAPID auto-generated on first run, rest-timer alerts, day reminders in
  each user's timezone.
* 12 UI languages; exercise instructions localized in 10; locale checks run in CI.
* Wake-lock during workouts; Android back-gesture handling.

## Known limitations (as of Phase 1)

* **Deferred branding items (data-compatibility, by design):** Android appId/package
  `ch.duartesantos.opengym` (needs native regen), mobile state filename `opengym-state.json`
  (needs migration path), plan-file format marker `opengym_plan` (kept for back-compat),
  upstream repo links (`REPO`, Settings source link) still point at openGym until MiGym has a
  published home. README/website/screenshots/banner still describe openGym (website is
  upstream's; refresh when MiGym gets its own site).
* No prebuilt MiGym Docker images yet — Compose builds locally (`--build`).

* Whole-state sync is last-write-wins: two devices editing concurrently can lose changes
  (documented risk; acceptable for personal use, must be redesigned before Cloud phase).
* JSON-file storage: fine for single-instance/family scale; no transactions, admin dashboard
  reads every user's state file per request.
* No ESLint/Prettier/TypeScript configuration exists in the repo.
* `exercises-data.js` (~888 KB source) makes the main bundle exceed 1500 kB (build warning).
* No server-side rate limiting by design (reverse proxy's job); invite codes are the brute-force
  mitigation for signup.
* Session cookies are HMAC-signed but carry no rotation beyond the `sv` counter; expiry baked in
  at issue time (lowering SESSION_DAYS does not shorten existing sessions).
* Tests require Node 22 to match CI/Docker. On Node ≥26, Node's experimental global
  `localStorage` breaks the happy-dom environment used by `Workout.remove.test.jsx`
  (7 spurious failures). Workaround while investigating: run vitest with
  `NODE_OPTIONS="--localstorage-file=<path>"`, or use Node 22.
* An upstream `origin/coach` branch exists (~9.7k lines: AI-coach providers, coach screens,
  plan validation) that is NOT merged into main. Do not merge it silently; evaluate against
  MiGym Phases 9/11 when those start.

## License constraints

* All project code: **AGPL-3.0-or-later** (inherited). Keep copyright notices.
* Exercise dataset text/media (hasaneyldrm/exercises-dataset): separate terms, NOT AGPL —
  fetched at deploy time, review before redistributing bundled media.
* Body-map path data (`frontend/src/lib/body-paths.js`): MIT (MuscleMap), notice preserved in
  [NOTICE.md](NOTICE.md).
* App-store distribution exception under AGPL §7 is granted by the original copyright holder
  (see NOTICE.md); its scope for MiGym must be confirmed with upstream before any store listing.
* Any future hosted/paid offering must comply with AGPL §13 (offer source to network users).
  Details: [docs/LICENSING.md](docs/LICENSING.md). This is documented, not legal advice.

## Development rules

1. Read `context.md`, `PRODUCT.md`, `ROADMAP.md`, `ARCHITECTURE.md` before every phase.
2. Inspect relevant code before changing it; never assume.
3. Preserve working functionality; incremental changes only; no rewrites.
4. Tests before refactoring critical logic; a feature isn't done because the UI works.
5. Run `npm test` (and build) before claiming done; never claim tests passed without running them.
6. No fake implementations (mock AI/auth/billing/analytics presented as real).
7. Small, conventional commits (`feat(workout): …`, `fix(progression): …`, `test(…): …`, `docs(…): …`).
8. Update documentation + this file at the end of every completed phase.
9. Never continue into the next major phase without explicit authorization.
