# Deployment — production guide (MiGym Phase 14)

Everything needed to run MiGym in production, hardened: HTTPS, rate limits, backups,
monitoring, updates. The quick-start lives at the top; the hardening checklist is the
part that turns a demo into a deployment.

Status: implemented and documented as of Phase 14. Nothing here is aspirational.

---

## 1. Architecture recap

| Service | Role | Health check |
|---|---|---|
| `web` | nginx: serves the built SPA, proxies `/api`, serves exercise media | `wget --spider /` every 5 min |
| `api` | Node 22: passkey auth, per-user JSON storage, coach links, snapshots | `wget --spider /api/health` every 5 min |
| `media` | one-shot clone of exercise images/GIFs into `./media` | exits 0 when done |

Durable state lives in exactly **two host folders**: `./data` (users, passkeys,
per-user state incl. server-side sync snapshots, session secret, VAPID keys) and —
re-downloadable, not a backup concern — `./media`.

## 2. Quick start (production)

```bash
git clone <MiGym repo> && cd MiGym
cp .env.example .env        # then edit: RP_ID, ORIGIN, SESSION_DAYS, COACH_UIDS…
docker compose up -d --build
curl -fsS http://localhost:${WEB_PORT:-8080}/api/health   # {"ok":true,...}
```

Then put it behind HTTPS (§4) — passkeys require it outside localhost.

## 3. Environment variables (complete reference)

| Variable | Default | Notes |
|---|---|---|
| `RP_ID` | `localhost` | exact hostname passkeys bind to. **Must match** the served domain |
| `ORIGIN` | `http://localhost:8080` | full public URL; https ⇒ Secure cookies |
| `WEB_PORT` | `8080` | host port nginx publishes |
| `NGINX_PORT` | `80` | container-internal listen port |
| `BACKEND` / `PORT` | `api` / `3000` | service name + port `/api` proxies to |
| `RP_NAME` | `MiGym` | shown in the passkey prompt |
| `SESSION_DAYS` | `90` | new-cookie lifetime only; existing cookies unaffected |
| `ADMIN_UIDS` | – | comma-separated user ids with the admin dashboard |
| `COACH_UIDS` | – | user ids granted the coach role (ADR-0007) |
| `INVITE_ONLY` | off | signup requires admin-generated invite codes |
| `VAPID_SUBJECT` | `$ORIGIN` | contact for web-push services |

Client-only (build/runtime): `ALLOW_GUEST` is inherited from upstream but **ignored by
MiGym clients** — local-first is the only mode (ADR-0005).

## 4. HTTPS + reverse proxy

Passkeys fail without HTTPS (localhost excepted). Terminate TLS in front of `${WEB_PORT}`.

### Caddy (simplest — automatic certificates + sane defaults)

```
gym.example.com {
    encode gzip
    # basic abuse protection for the auth surface (the app itself has none by design)
    @authpaths path /api/register/* /api/login/*
    rate_limit @authpaths { zone auth { events 20 window 1m } }
    reverse_proxy 127.0.0.1:8080
}
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name gym.example.com;
    ssl_certificate     /etc/letsencrypt/live/gym.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gym.example.com/privkey.pem;

    # HSTS + baseline headers (app sets theme/meta only)
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "same-origin" always;

    location / {
        limit_req zone=perip burst=20 nodelay;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
# limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;   (http{} block)
```

**Checklist:** redirect port 80 → 443 · set `RP_ID=gym.example.com`,
`ORIGIN=https://gym.example.com` · verify a passkey login after switching.

## 5. Backups & restore

The only durable folder is `./data` (`db.json`, `state-<uid>.json`,
`snapshots/<uid>/` — the server-side sync safety net added in ADR-0006 Stage 1 —
`secret`, `vapid.json`). `secret` loss invalidates ALL sessions; `db.json` loss deletes
accounts; both are irreplaceable, everything else is re-creatable.

```bash
scripts/backup.sh                 # → backups/migym-data-<stamp>.tar.gz (keeps last 14)
scripts/restore.sh backups/migym-data-20260822-120000.tar.gz --wipe
```

Cron example (nightly 03:17):

```
17 3 * * * cd /srv/migym && ./scripts/backup.sh >> backups/backup.log 2>&1
```

**Restore drill (do it once before going live):**
1. `docker compose stop api web`
2. `./scripts/restore.sh <archive> --wipe`
3. `docker compose up -d` → log in with a passkey → confirm workouts visible.
4. Also test the in-app path once: Settings ▸ Sync & backup ▸ Restore from snapshot
   (server-side snapshots from ADR-0006).

Off-site: copy `backups/` somewhere else (rsync/rclone). A backup on the same disk as
the data is not a backup.

## 6. Monitoring & logging

* **Health endpoints**: `GET /api/health` → `{ok:true}`; web `/`. Both containers also
  carry Docker HEALTHCHECKs (`docker ps` shows healthy/unhealthy).
* **Uptime**: point any checker (Uptime-Kuma, healthchecks.io, cron+curl) at
  `https://…/api/health` every minute.
* **Disk watch**: storage grows with users × history. Alert at e.g. 80 % usage:
  `df -P /srv/migym | awk 'NR==2{exit !($5+0 > 80)}'`.
* **Logs**: `docker compose logs -f api web` (JSON console lines; failed pushes, push
  send failures, unhandled route errors). For retention add a logging driver:

```yaml
# compose override: docker-compose.override.yml
services:
  api:
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }
  web:
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }
```

## 7. Updates & rollback

```bash
git pull
docker compose build            # images are local-built (migym-api / migym-web)
docker compose up -d            # recreate changed services only
docker image prune -f           # optional cleanup
```

Rollback = `git checkout <previous-tag>` + rebuild; user data is untouched by deploys
(format changes are additive by policy — see docs/DATA_MODEL.md). Server-side sync
snapshots (last 10 per user) additionally protect against bad state writes.

## 8. Security checklist (pre-launch)

- [ ] HTTPS live; `ORIGIN` matches; test passkey login on the public URL.
- [ ] Rate limiting active at the proxy (auth paths especially).
- [ ] `.env` has `SESSION_DAYS` tuned (lower for open internet), `INVITE_ONLY` if wanted.
- [ ] `ADMIN_UIDS` set only for real operators; `COACH_UIDS` only for real coaches.
- [ ] `chmod 700 ./data` on the host; never commit `.env` or `data/`.
- [ ] Nightly backup cron + off-site copy + one completed restore drill.
- [ ] Auto security updates for the host OS; Docker images rebuilt monthly
      (`node:22-alpine` base tracks security patches).
- [ ] No rate limiting inside the app BY DESIGN — the proxy owns this (see docs/SECURITY.md).

## 9. Local development (no Docker)

```bash
cd api && PORT=3000 DATA_DIR=./data npm start          # terminal 1
cd frontend && npm install && npm run dev              # terminal 2 (:5173, proxies /api,/img,/gif)
cd frontend && npm run build:mobile                    # Capacitor flavor (docs/MOBILE.md)
```

Frontend tests: `npm test` (Node ≥22); API integration tests: `npm test` in `api/`
(spawns the real server on a temp DATA_DIR).
