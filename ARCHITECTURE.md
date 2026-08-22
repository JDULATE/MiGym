# MiGym — Architecture

Status: Phase 0 audit of the inherited openGym codebase (commit `4b25a80`, v1.2.7+).
No architectural changes have been made yet.

## System overview

```
                    ┌────────────────────────────────────────────┐
  Browser / PWA ───▶│  web (nginx)                               │
  Android (Cap.)    │   ├─ serves built SPA (frontend/dist)      │
                    │   ├─ proxies /api ──────────────────┐      │
                    │   └─ serves /img /gif media volume  │      │
                    └─────────────────────────────────────┼──────┘
                                                          ▼
                                    ┌─────────────────────────────────┐
                                    │  api (Node 22, no framework)    │
                                    │   ├─ WebAuthn passkey auth      │
                                    │   ├─ signed-cookie sessions     │
                                    │   ├─ web-push (VAPID)           │
                                    │   └─ ./data JSON file store     │
                                    └─────────────────────────────────┘

  Optional, not in the Docker build:
    mcp/ — stdio MCP server letting a local LLM read one user's state (read-only)
    website/ — static marketing/docs site (GitHub Pages; also hosts the demo build)
```

## Design system (documented in Phase 1, inherited unchanged)

The visual language lives in `frontend/src/index.css` as CSS custom properties and four
explicit rules (stated in the file header):

1. **One type scale, mostly regular weight** — weight carries meaning (600 titles, 400 body);
   size does the rest. No decorative bold-everything.
2. **Neutral surface ramp** — `--bg #000`, `--bg-el #0e0e10`, `--surface #1c1c1e`,
   `--surface-2 #2c2c2e`, `--surface-3 #3a3a3c`; colour is spent only on the accent and status.
3. **Hairlines, not borders** — sub-pixel separators (`--hair: .5px`) inset past the icon rail.
4. **Motion that acknowledges, not animates** — ~2% press scale, 140–220 ms ease-out
   (`--ease: cubic-bezier(.32,.72,0,1)`); nothing bounces.

Other tokens: 8 accents per profile (`ACCENTS` in `lib/format.js`, default lime/green
`#30d158`), radius scale (`--r-sm 8px … --r-xl 22px`), base padding `--pad: 16px`,
safe-area inset `--sab`. Light theme overrides the same tokens via `[data-theme=light]`.
Layout is mobile-first: single column `.narrow` container, bottom TabBar with large touch
targets, sheets for secondary flows. Brand mark/colours: `#30d158` on `#0c0e12`
(regenerable via `frontend/scripts/make-icons.ps1`).

MiGym keeps this system; new screens must consume the tokens rather than hardcode values.

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/` | React 19 + Vite SPA. Also builds the Capacitor mobile app (`VITE_MOBILE=1`). |
| `frontend/src/lib/` | **Pure business logic** (progression, 1RM, effort, fatigue, muscles, history, import/export, i18n core) with colocated Vitest tests. Shared by views and by `mcp/`. |
| `frontend/src/views/` | Route screens: Login, Home, Plan, RoutineEdit, Workout, Stats, History, Library, Settings, Admin (+ component tests). |
| `frontend/src/store/` | Zustand: `useStore.js` (app data `S`, sync, auth session), `useUI.js` (rest/work timers, sheets, toasts). |
| `frontend/src/components/` | TabBar, RestTimer, Modals/sheets, LineChart, Heatmap, BodyMap, Icon set, Toast, ErrorBoundary. |
| `frontend/public/` | PWA manifest, service worker (`sw.js`), icons. |
| `frontend/src/locales/` + `src/instr/` | 12 UI locale packs; localized exercise instructions (10 languages), checked in CI. |
| `api/` | Single-file Node HTTP server (`server.js`, ~560 lines): routes table, passkeys, push, admin, per-user state files. Two dependencies only. |
| `web/` | Multi-stage Docker build → nginx serving SPA + `/api` proxy on **one origin** (WebAuthn requirement); config rendered from env at startup. |
| `mcp/` | Optional MCP server (read-only, stdio) reusing `frontend/src/lib` helpers via Vite-generated shims; own Vitest suite + node-loadability check. |
| `website/` | Static site for the hosted instance/docs/demo. |
| `docs/` | SELF_HOSTING.md, MOBILE.md (inherited) + MiGym docs (this tree). |
| `scripts/` | Exercise-instruction dataset builder, media fetch script. |
| `.github/workflows/` | `test.yml` (tests+build+locale checks+fatigue probe, PR & main), `docker-publish.yml`, `pages.yml`; dependabot. |

## Frontend architecture

* **Routing:** `HashRouter` with routes `/home /plan /plan/r/:id /workout /stats /history
  /library /settings /admin` (`src/App.jsx`). Unauthenticated users get Login; guests bypass.
  `/admin` gated on `user.admin`.
* **State:** one serializable object `S` in Zustand (`useStore.js`) holding everything a profile
  owns (settings, routines, week plan, workouts, bodyweight log, custom exercises, reminder,
  effort scale). `update()` clones-mutates-persists to localStorage (debounced) then schedules a
  debounced server push (1.5 s). `useUI.js` holds ephemeral session state (rest timer, work
  timer, sheets, toast) that is deliberately *not* synced.
* **Persistence:** `localStorage["gym_state_v1"]`; mobile build mirrors to an app-private file
  (`opengym-state.json`) as the durable copy. Sync protocol: `PUT /api/data` whole-state with
  `_ts`; pull on boot compares `_ts` + local dirty flag (last-write-wins). The active workout
  never leaves the device (client skips it; server strips it defensively).
* **Business logic:** pure functions under `lib/` — this is the part MiGym will grow into the
  progression engine and analytics system. Key modules: `progression.js` (policies off/linear/
  greyskull/double/time, deloads, bodyweight rep/set progression, explainable `why`),
  `onerm.js` (Epley/Brzycki/Lombardi, REP_CAP=12), `effort.js` (RIR internal scale, RPE display),
  `recovery.js` (intensity-weighted fatigue with exponential decay), `muscles.js`
  (alias-normalized muscle mapping), `history.js` (set/routine summaries, modes),
  `import-csv.js` (FitNotes/Strong/Hevy dialects + Apple Health XML bodyweight).
* **PWA:** runtime service worker: media cache-first, app shell network-first with offline
  fallback, never caches `/api/*`. Web Push handlers for rest-timer/day reminders.
* **i18n:** `i18n-core.js` (framework-free, shared with mcp/) + `i18n.js` (Vite glob loader);
  template strings `{0}`-style.

## Backend architecture

Single process, zero framework. A literal routes table maps `"METHOD /path"` → async handler.
Notable behaviors:

* **Auth:** WebAuthn registration/login with in-memory challenge store (5-min TTL). Session =
  HMAC-SHA256-signed cookie payload `uid:expiry:sessionVersion`; `POST /api/logout/all` bumps
  the user's `sv` counter invalidating every prior cookie. Disabled accounts locked out at
  session-read time. No passwords exist anywhere.
* **Authorization:** only two levels — authenticated user and admin (env `ADMIN_UIDS` or
  `user.admin` flag, enforced server-side via `requireAdmin`). No roles beyond that yet.
* **Storage:** `data/db.json` = `{users, creds, subs, invites}` (atomic writes);
  `data/state-<uid>.json` = each user's full state blob; `data/secret` = HMAC key (0600);
  `data/vapid.json` = auto-generated push keys.
* **Push:** rest-timer alerts scheduled in-process per user; daily workout reminders scanned
  every 10 s computing "now" in each user's IANA timezone.
* **Presence:** ephemeral in-memory map fed by `POST /api/activity` heartbeats for the admin
  dashboard ("who's training now").
* **Limits:** 5 MB request cap; JSON-only bodies; no rate limiting by design (reverse proxy's
  responsibility — documented in docs/SECURITY.md).

## Deployment architecture

Docker Compose: one-time `media` fetcher (~140 MB exercise images/GIFs from the upstream
dataset), `api` (Node, mounts `./data`), `web` (nginx, publishes `${WEB_PORT}:80`,
mounts media read-only, proxies `/api`). Both images have healthchecks. Prebuilt multi-arch
images on ghcr.io; building from source needs no local Node. See docs/DEPLOYMENT.md.

## Build flavors

1. Self-hosted web (default): talks to the API.
2. Demo (GitHub Pages): guest-only, seeded example data, no backend.
3. Mobile (Capacitor): no backend at all; file mirror persistence; native notifications;
   CDN-hosted exercise media.

## Strengths (audit findings)

* Clean separation of pure logic vs UI; logic is genuinely unit-testable and already tested.
* Tiny dependency surface (2 API deps, 4 frontend runtime deps incl. Capacitor).
* Strong product thinking in inherited features (warm-up exclusion, honest session reading,
  explainable progression) with rationale documented in code comments.
* One-origin nginx proxy solves WebAuthn cleanly; healthchecks and multi-arch images included.
* Excellent operational defaults for self-hosters (auto VAPID keys, timezone-aware reminders,
  atomic writes).

## Weaknesses / technical debt

1. **Sync model:** whole-state PUT + `_ts` last-write-wins can lose concurrent edits from two
   devices. Acceptable now; must be redesigned before Cloud phase (Phase 10).
2. **Storage:** single JSON files; no indexes/transactions; admin endpoints read all users'
   state files per request. Fine at family scale, not beyond.
3. **No tooling:** no ESLint/Prettier/TypeScript anywhere; style discipline lives in review only.
4. **Bundle:** generated `exercises-data.js` (~888 KB source) pushes main chunk past 1.5 MB
   (warning configured up to exactly that limit).
5. **Tests:** excellent coverage of lib logic; component tests are few and rely on linkedom/
   happy-dom shims; no E2E tests; no API tests at all (the only untested runtime code).
6. **Node version sensitivity:** happy-dom-based test fails under Node ≥26 (experimental global
   `localStorage`); CI pins Node 22 — document/enforce engines.
7. Upstream `coach` branch diverges (~9.7k lines, AI-coach oriented) — potential reuse for
   Phases 9/11 but must be evaluated, not merged blindly.

## Recommended changes (for later phases, in order)

1. Add repo-level tooling: ESLint (+ react hooks plugin) and `npm run lint` wired into CI (Phase 1).
2. Pin Node 22 via `engines` field + `.nvmrc` to prevent environment drift (Phase 1).
3. Extract API route tests (supertest-style against the raw http server) before any auth change.
4. Keep growing logic in `lib/` (or a future `progression-engine/` workspace) — never inside views.
5. Defer storage/sync redesign until Phase 10; until then document the LWW risk clearly.

## Features to preserve untouched

See "Protected functionality" in [context.md](context.md). Anything not listed there still
requires an explicit decision before removal — nothing gets deleted silently.
