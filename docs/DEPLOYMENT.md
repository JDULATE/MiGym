# Deployment

Status: Phase 0 audit. The inherited deployment story is Docker Compose; it is documented for
self-hosters in `docs/SELF_HOSTING.md` (upstream) and summarized here as the baseline MiGym
ships with.

## Quick start (inherited)

```bash
git clone <MiGym repo>
cd MiGym
cp .env.example .env
docker compose up -d --build   # builds migym-api + migym-web locally (no prebuilt images yet)
```

Open `http://localhost:8080`, create a profile (passkey) or continue as guest.
First start downloads exercise media (~140 MB) once via the one-shot `media` service.

## Topology

| Service | Image | Role |
|---|---|---|
| `media` | alpine/git (one-shot) | clones upstream exercises-dataset into `./media/img`, `./media/gif`; skipped when populated |
| `api` | `migym-api` (built from source; no prebuilt MiGym images yet) | Node 22, passkey auth + per-user JSON storage; mounts `./data` |
| `web` | `migym-web` (built from source) | multi-stage build of `frontend/` → nginx; proxies `/api` → `${BACKEND}:${PORT}`; serves media read-only |

Note: since Phase 1, Compose builds local images named `migym-api` / `migym-web`; the upstream
`ghcr.io/duartesantos8/opengym-*` images are intentionally not referenced (openGym branding).
`docker compose pull` therefore does nothing until prebuilt MiGym images are published —
use `docker compose up -d --build`.

Both long-running containers define HEALTHCHECKs (`wget --spider` against `/` and
`/api/health`). Images are built multi-arch (amd64 + arm64); the frontend build stage pins to
the host platform to avoid QEMU/esbuild corruption (see web/Dockerfile comments).

## Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `RP_ID` / `ORIGIN` | localhost / http://localhost:8080 | WebAuthn binding — must match the served hostname/URL exactly |
| `WEB_PORT` / `NGINX_PORT` | 8080 / 80 | host port; container listen port |
| `BACKEND` / `PORT` | api / 3000 | service name + port `/api` proxies to |
| `RP_NAME` | MiGym | name shown in the passkey prompt |
| `SESSION_DAYS` | 90 | sign-in lifetime (new cookies only) |
| `ADMIN_UIDS` | – | comma-separated user ids granted the admin dashboard |
| `INVITE_ONLY` | off | require invite codes for signup |
| `ALLOW_GUEST` | on | offer "Continue without account" |
| `VAPID_SUBJECT` | ORIGIN | contact URL for web-push services |

Push keys auto-generate into `./data/vapid.json` on first run — nothing to configure.

## Data & backups

Everything durable lives in **two host folders**:

* `./data/` — `db.json` (users/passkeys/subscriptions/invites), `state-<uid>.json`,
  `secret` (session HMAC key), `vapid.json`.
* `./media/` — re-downloadable at any time (not a backup concern).

Backup = stop-or-snapshot + copy `./data` (file-level copy while running risks torn writes;
the API uses atomic tmp+rename per file, so per-file copies are consistent individually).
Restore = put the folder back and restart. Documented drill tasks for Phase 14:
automated scheduled backup, restore rehearsal, integrity check script.

## HTTPS

Passkeys require an HTTPS domain in production (localhost excepted). Terminate TLS at your own
reverse proxy/tunnel pointed at `${WEB_PORT}`, then set `RP_ID=domain` + `ORIGIN=https://…`
(see docs/SELF_HOSTING.md). Cookies automatically gain the Secure flag from `ORIGIN`.

## Local development (no Docker)

```bash
# terminal 1 — API (uses ./data relative dir)
cd api && PORT=3000 DATA_DIR=./data RP_ID=localhost ORIGIN=http://localhost:5173 npm start
# terminal 2 — frontend dev server (proxies /api,/img,/gif)
cd frontend && npm install && npm run dev     # vite :5173, API_TARGET/MEDIA_TARGET env override
```

Exercise media for dev: run the compose `media` service or any static server on :8888
(`MEDIA_TARGET`). Mobile flavor: `npm run build:mobile` then Capacitor tooling
(docs/MOBILE.md).

## Phase 14 obligations (not yet done)

Production hardening doc will cover: log collection/rotation, monitoring/alerting on health
endpoints, update & rollback procedure, scheduled backups + tested restore, security checklist
(rate limiting at proxy, headers), resource limits, and a compose file review for production
graceful-shutdown behavior. None of this exists yet — do not claim it does.
