# MiGym — Security Audit for Deployment

Date: 2026-08-22 · Scope: entire project · Method: manual code review following OWASP Top 10
and semgrep-rules vulnerability categories (injection, auth, secrets, XSS, SSRF, misconfig,
deserialization, access control). Every file in `api/`, `frontend/src/lib/`,
`frontend/src/store/`, `frontend/src/giwi/`, `docker-compose.yml`, `.env.example` reviewed.

---

## 1. INJECTION

### Command injection
| Location | Risk | Finding |
|---|---|---|
| `api/server.js` | ✅ SAFE | No `exec`, `spawn`, `child_process` used anywhere. Server is pure `http` + `fs`. |
| Frontend | ✅ SAFE | No `eval()`, no `new Function()`, no `document.write()` in any shipped file. |

### XSS (Cross-Site Scripting)
| Location | Risk | Finding |
|---|---|---|
| React JSX rendering | ✅ SAFE | React escapes all interpolated values by default. No use of `dangerouslySetInnerHTML` anywhere in `src/`. |
| `sheets.jsx` printPlan | ✅ SAFE | User names inserted into HTML template via `esc()` helper (HTML entity encoding). |
| `plan-share.js` PDF export | ⚠️ **LOW** | `esc()` is applied to names and routine names, but exercise names from the dataset are inserted without escaping. Dataset is trusted (not user-generated), so exploit requires a malicious custom exercise name. Custom exercises go through `esc()` ✓. |
| `GiwiOnboarding.jsx` | ✅ SAFE | All user input rendered via React JSX (auto-escaped). |

### Path traversal
| Location | Risk | Finding |
|---|---|---|
| `api/server.js` `stateFile()` | ✅ SAFE | uid sanitized: `uid.replace(/[^a-zA-Z0-9_-]/g, '')` strips all path separators before constructing the file path. |
| `api/server.js` `snapDir()` | ✅ SAFE | Same sanitization. |
| `api/server.js` `readSnapshot()` | ✅ SAFE | Snapshot id validated: `/^\d+\.json$/` — only numeric filenames accepted. |

### SQL injection
✅ **N/A** — No SQL database. JSON files only.

---

## 2. AUTHENTICATION & SESSION MANAGEMENT

| Location | Risk | Finding |
|---|---|---|
| Session cookie | ✅ GOOD | HMAC-SHA256 signed, HttpOnly, SameSite=Lax, Secure when HTTPS. Payload: `uid:expiry:sv`. |
| Session revocation | ✅ GOOD | `sv` counter bump on "end all sessions" invalidates all prior cookies. |
| Passkey verification | ✅ GOOD | `@simplewebauthn/server` handles WebAuthn attestation/assertion verification. Origin and RP_ID enforced. |
| Challenge replay | ✅ GOOD | Challenges are single-use (removed from map after read), 5-min TTL. |
| Cookie lifetime | ⚠️ NOTE | 90-day default. No refresh mechanism. A stolen cookie is valid until expiry or `sv` bump. Documented in SECURITY.md. |
| `POST /api/logout` | ✅ SAFE | Clears cookie server-side. |
| `POST /api/logout/all` | ✅ GOOD | Bumps `sv` counter → all cookies invalid. |

**No passwords exist** — authentication is passkeys only. No credential stuffing surface.

---

## 3. AUTHORIZATION & ACCESS CONTROL

| Endpoint | Auth | Authz | Status |
|---|---|---|---|
| `GET /api/data` | ✓ session | Own data only (uid from session, not from request) | ✅ |
| `PUT /api/data` | ✓ session | Own data only | ✅ |
| `GET /api/admin/*` | ✓ session + admin | `requireAdmin()` checks env-configured uid list | ✅ |
| `GET /api/coach/*` | ✓ session + coach role or link | Link verified per request | ✅ |
| `POST /api/coach/code` | ✓ session | Any authenticated user | ✅ |
| `POST /api/coach/link` | ✓ session + coach | Pairing code single-use, 15-min TTL | ✅ |
| `POST /api/coach/revoke` | ✓ session | Client can only revoke own links | ✅ |
| `GET /api/data/snapshots` | ✓ session | Own snapshots only | ✅ |
| `GET /api/data/snapshot?id=` | ✓ session | Own snapshots only; id regex-validated | ✅ |
| `GET /api/push/*` | ✓ session | Own subscriptions only | ✅ |
| `POST /api/activity` | ✓ session | Own presence only | ✅ |

**Findings:**
* ✅ Every route re-verifies session + role on each request. No client-side trust.
* ✅ uid always derived from the signed session cookie, never from request params.
* ⚠️ **MEDIUM**: No rate limiting on any endpoint. The API has zero built-in rate limiting.
  Mitigation: reverse proxy (documented in DEPLOYMENT.md §4). For cloud deployment,
  add per-IP rate limiting at the edge.
* ⚠️ **LOW**: `/api/coach/code` can be called repeatedly, generating unlimited codes.
  Each code expires in 15 min and is single-use, but there's no per-user code limit.

---

## 4. SENSITIVE DATA EXPOSURE

| Item | Location | Risk | Finding |
|---|---|---|---|
| Session secret | `data/secret` | ✅ GOOD | 32 random bytes, file mode 0600, outside git. |
| VAPID keys | `data/vapid.json` | ✅ GOOD | Auto-generated, file mode 0600. |
| API keys (AI coach) | `localStorage migym_coach_cfg` | ✅ GOOD | Outside synced state `S`, never sent to MiGym server. |
| Passkey private keys | User's authenticator | ✅ GOOD | Never touch the server (WebAuthn model). |
| `.env` file | `.gitignore` ✓ | ✅ GOOD | Not committed. |
| `data/` directory | `.gitignore` ✓ | ✅ GOOD | Not committed. |
| Profile data (name, age, weight, height) | `S.profile` | ✅ GOOD | Syncs only to user's own linked server. Giwi onboarding is local-only. |
| AI coach context | `lib/coach.js` | ✅ GOOD | Bounded digest, no raw workout data sent to AI endpoint without user action. |
| Console logging | `api/server.js` | ✅ GOOD | Logs route + errors only, no user data or tokens. |

**Findings:**
* ✅ No hardcoded secrets anywhere in the codebase.
* ✅ `.env.example` contains only placeholder values.
* ⚠️ **LOW**: Error messages from the API include internal details (e.g. `e.message` from
  WebAuthn library). Acceptable for self-hosted; consider sanitizing for cloud.

---

## 5. SECURITY MISCONFIGURATION

| Item | Risk | Finding |
|---|---|---|
| CORS | ⚠️ **MEDIUM** | No CORS headers are set. The API is same-origin behind nginx proxy, which is correct for the self-hosted model. However, if someone exposes the API port directly (3000), any origin could make requests. Mitigation: don't expose port 3000; only expose 8080 (nginx). |
| HTTPS enforcement | ⚠️ **MEDIUM** | `Secure` flag on cookies is set only when `ORIGIN` starts with `https:`. On plain HTTP, cookies are sent without Secure. This is documented but operators must configure HTTPS. |
| Docker | ✅ GOOD | Containers run as non-root (node images default to `node` user). No privileged mode. No host network mode. |
| Dependencies | ✅ GOOD | `npm audit` reports 0 vulnerabilities in both `api/` and `frontend/`. |
| `data/` permissions | ⚠️ **LOW** | Directory permissions depend on host OS. DEPLOYMENT.md recommends `chmod 700`. |

---

## 6. INSECURE DESERIALIZATION

| Location | Risk | Finding |
|---|---|---|
| `JSON.parse` on API bodies | ✅ SAFE | `readBody()` wraps in try/catch, size-capped at 5 MB. Malformed JSON → 500. |
| `JSON.parse` on state files | ✅ SAFE | Wrapped in try/catch, returns null on corrupt file. |
| Backup import (`doImport`) | ✅ SAFE | `JSON.parse` in try/catch, validates `data.workouts` and `data.routines` exist. |
| Plan share import (`parsePlan`) | ✅ SAFE | Validates structure, filters invalid exercises. |
| `normalizeProfile` | ✅ SAFE | Every field validated against type/range/enum before storage. |

---

## 7. SERVER-SIDE REQUEST FORGERY (SSRF)

✅ **N/A** — The API server makes no outbound HTTP requests except:
* Web-push notifications (to user-registered push endpoints, which are browser push service URLs — not attacker-controlled).

---

## 8. GIWI / ONBOARDING SPECIFIC

| Item | Risk | Finding |
|---|---|---|
| Onboarding flags | ✅ SAFE | Device-local localStorage, outside synced `S`. |
| Profile data from onboarding | ✅ SAFE | Goes through `normalizeProfile()` — all fields validated. |
| Weight → `S.bodyweight` | ✅ SAFE | Appended via existing mechanism, no direct injection. |
| Tutorial state | ✅ SAFE | Device-local, no server interaction. |
| Expression SVGs | ✅ SAFE | Static files shipped with the app, no external loading. |
| Giwi dialogue | ✅ SAFE | All strings are static, no user-controlled content injected into dialogue. |

---

## 9. DEPENDENCY VULNERABILITIES

| Package | Version | Known CVEs | Status |
|---|---|---|---|
| react | 19.x | None known | ✅ |
| react-dom | 19.x | None known | ✅ |
| react-router-dom | 7.x | None known | ✅ |
| zustand | 5.x | None known | ✅ |
| @simplewebauthn/server | 13.x | None known | ✅ |
| web-push | 3.x | None known | ✅ |
| vite | 8.x | None known | ✅ |
| vitest | 4.x | None known | ✅ |
| eslint | 9.x | N/A (dev) | ✅ |

`npm audit` reports 0 vulnerabilities in both `api/` and `frontend/` as of audit date.

---

## 10. SUMMARY & DEPLOYMENT READINESS

### Critical: 0
### High: 0
### Medium: 2
| # | Finding | Mitigation |
|---|---|---|
| M-1 | No rate limiting on API endpoints | Reverse proxy rate limiting (documented in DEPLOYMENT.md §4). Mandatory for cloud deployment. |
| M-2 | No CORS headers — API must never be exposed on port 3000 directly | Documented. Only nginx port 8080 should be public. |

### Low: 5
| # | Finding | Notes |
|---|---|---|
| L-1 | Exercise names in PDF export not HTML-escaped | Dataset names are trusted; custom exercise names go through `esc()` ✓ |
| L-2 | 90-day cookie with no refresh | Documented; `sv` bump provides revocation |
| L-3 | Unlimited pairing codes per user | 15-min TTL + single-use mitigates |
| L-4 | Error messages may include internal details | Acceptable for self-hosted |
| L-5 | `data/` directory permissions depend on host OS | `chmod 700` documented |

### Verdict: **READY FOR DEPLOYMENT** with the two medium findings mitigated
by the reverse-proxy configuration documented in `docs/DEPLOYMENT.md §4`.
Both are deployment-configuration items, not code changes.
