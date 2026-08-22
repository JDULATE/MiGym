# API Reference

Status: Phase 0 audit — documents the inherited API exactly as implemented in
`api/server.js`. All routes JSON over HTTP; single origin behind nginx (`/api` proxy).
Authentication (unless noted) = `gymsid` HttpOnly cookie: HMAC-signed `uid:expiry:sessionVersion`.

## Public

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/health` | – | liveness probe → `{ ok, users }` |
| `GET /api/config` | – | public instance config → `{ invite_only, allow_guest }` |
| `POST /api/register/options` | – | body `{ name ≤40 chars, code? }`; invite checked when `INVITE_ONLY`; returns WebAuthn registration `options` + challenge id `cid` (TTL 5 min) |
| `POST /api/register/verify` | – | verify attestation; creates user + credential; burns invite; sets session cookie |
| `POST /api/login/options` | – | discoverable-passkey auth options + `cid` |
| `POST /api/login/verify` | – | verify assertion; disabled accounts get 403; sets cookie |

## Session

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/me` | ✓ | `{ user: { id, name, admin } }` or 401 |
| `POST /api/logout` | – | clears cookie (client pushes state first) |
| `POST /api/logout/all` | ✓ | bumps user's `sv` counter → every issued cookie invalid on all devices; clears this one too |

## User data

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/data` | ✓ | `{ state }` — full per-user state blob (`state-<uid>.json`); `{ state: null }` if none |
| `PUT /api/data` | ✓ | body `{ state }` (object required, ≤5 MB); **strips `state.active`** (device-local); archives the previous blob as a snapshot (keep 10, ADR-0006); atomic write; returns `{ ok, ts }` |
| `GET /api/data/snapshots` | ✓ | `{ snapshots: [{ id, ts }] }` newest first — restore flow (ADR-0006) |
| `GET /api/data/snapshot?id=<ts>` | ✓ | `{ state }` for one snapshot; 404 if unknown id (ids are numeric strings only) |

## Push notifications

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/push/public-key` | – | VAPID public key |
| `POST /api/push/subscribe` | ✓ | `{ subscription:{endpoint,keys{p256dh,auth}} }`, replaces same endpoint |
| `POST /api/push/unsubscribe` | ✓ | `{ endpoint }` |
| `POST /api/push/test` | ✓ | sends a test notification |
| `POST /api/push/rest-timer` | ✓ | `{ seconds 1..3600 }` → server-side fallback alert if tab suspended |
| `POST /api/push/rest-timer/cancel` | ✓ | cancels the pending rest alert |

## Presence

| Method & path | Auth | Description |
|---|---|---|
| `POST /api/activity` | ✓ | heartbeat `{ active:true, name≤60, exIdx, exTotal, setsDone, setsTotal, startedAt }` or `{active:false}` to drop; ephemeral, TTL ~70 s |

## Coach platform (MiGym phase 11, ADR-0007)

Consent-based links: the client mints a single-use pairing code (15-min TTL) with a chosen
scope; a coach account (role via `COACH_UIDS` env) redeems it. Scopes are enforced
server-side before serialization; either side can revoke at any time.

| Method & path | Auth | Description |
|---|---|---|
| `POST /api/coach/code` | ✓ user | `{ scope: 'summary'\|'full' }` → `{ code, expiresInSec }`; one live code per user |
| `POST /api/coach/link` | ✓ coach | `{ code }` → creates/refreshes link with the code's scope; codes are single-use |
| `GET /api/coach/clients` | ✓ coach | roster: name, scope, total workouts, last-30 count, last session/sync, note count |
| `GET /api/coach/client?id=` | ✓ coach | summary always; `workouts[]`+`routines[]` only when link scope = `full`; includes link notes |
| `POST /api/coach/note` | ✓ coach | `{ clientId, text ≤1000 }` — stored on the link, visible to both sides |
| `GET /api/coach/mylinks` | ✓ user | the caller's links (coach names, scopes, notes) + pending pairing codes |
| `POST /api/coach/revoke` | ✓ user | `{ coachId }` — immediate unilateral unlink |

Authorization notes: every route re-verifies session + role + link on each request;
summary responses are computed from state (never redacted copies); `/api/me` now reports
`role`.

## Admin (`requireAdmin`: valid session AND admin)

| Method & path | Description |
|---|---|
| `GET /api/admin/users` | per-user overview: workout count, last workout/sync, push flag, live presence. Reads each state file once per call (documented scale limit). |
| `GET /api/admin/user?id=` | full drill-down for one user: routines, bodyweight log, workouts (newest first) |
| `POST /api/admin/user/disable` | `{ id, disabled }`; admins cannot be disabled; drops live presence |
| `GET /api/admin/invites` | list invites with usedBy resolved to name |
| `POST /api/admin/invites/new` | generates 16-hex-char code (64-bit entropy; no rate limiting by design) |
| `POST /api/admin/invites/revoke` | only unused invites can be revoked |

## Error contract

Errors are `{ error: string }` with status 400/401/403/404/409/500. Unknown paths → 404.
Unhandled handler exceptions → logged + 500. Bodies must be JSON ≤5 MB.

## Notable design facts

* No rate limiting at the app layer (reverse proxy's job — see docs/SECURITY.md).
* Challenge store and presence are in-memory; restart loses pending challenges only.
* The API is intentionally framework-free; adding middleware (e.g. future rate limiting,
  roles in Phase 11) should stay consistent with the routes-table pattern or be a documented,
  justified exception.

## MiGym additions

### Progression engine API (Phase 4)

The deterministic training-mathematics layer lives at `frontend/src/lib/engine/index.js`.
Future code (analytics, adaptive training, AI coach) must consume this boundary instead of
deep-importing `lib/` internals. All functions are pure; prescriptions always carry an
explanation (`why`); nothing here is probabilistic or medical.

| Module | Exports |
|---|---|
| `engine` (progression) | `POLICIES`, `POLICIES_FOR`, `POLICY_NAME`, `POLICY_DESC`, `DELOAD_AFTER`, `MAX_BW_SETS`, `defaultIncrement`, `DEFAULT_SEC_INCREMENT`, `policyFor`, `readSession`, `sessionsFor`, `stallCount`, `nextPrescription(S,cfg,routine)` → `{weight?,reps?,sec?,sets?,kind,why}`, `applyPrescription(sets,p)` |
| `engine` (deload) | `DELOAD_FACTOR`, `deloadTo(cur,step)` |
| `engine` (strength) | `estimate1RM(w,r,formula?)`, `bestSetOf(entry)`, `e1rmSeries(S,exId)`, `best1RM(S,exId)`, `is1RMRecord(S,exId,entry)`, `REP_CAP=12`, `FORMULAS`, `DEFAULT_FORMULA` |
| `engine` (effort/rir/rpe) | `rirOf(set)`, `toScale(kind,rir)`, `displayScale(S)`, `avgRir`, `effortSummary(S,days)`, `effortWeeks(S,days)`, `effortHistogram(S,days)`, `isHardSet`, constants |
| `engine` (fatigue) | fatigue model constants from `lib/recovery.js` (functions remain there until a phase needs them through the boundary) |
| `engine` (volume) — new in Phase 4 | `setTonnage(set)`, `entryVolume(entry)`, `workoutVol(w)`, `workoutTonnage(S)` → `[{d,start,vol}]`, `weeklyVolume(S)` → `[{week,vol}]` (Monday buckets), `volumeByExercise(S,exId)` |

Volume semantics: completed work sets only (warm-ups excluded by design, matching every
other statistic); tonnage = load × reps; timed/cardio sets contribute 0 tonnage (their
stimulus is duration-based and weighted in the fatigue model, never faked as kilograms).

Implementation note: current function bodies remain in `lib/progression.js`, `lib/onerm.js`,
`lib/effort.js`, `lib/recovery.js` (views + MCP server import those stable paths); the engine
barrel defines the boundary and can absorb physical relocations later without changing
consumers. Engine-level multi-session trajectory scenarios live in
`frontend/src/lib/engine/tests/`.
