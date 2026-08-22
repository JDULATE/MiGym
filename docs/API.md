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
| `PUT /api/data` | ✓ | body `{ state }` (object required, ≤5 MB); **strips `state.active`** (device-local); atomic write; returns `{ ok, ts }` |

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

None yet. Future endpoints (profile, analytics exports, coach authorization, cloud sync)
will be specified here before implementation, each tied to its roadmap phase.
