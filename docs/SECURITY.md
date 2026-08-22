# Security

Status: Phase 0 audit of inherited openGym security posture + MiGym obligations.

## Authentication

* **Passkeys only (WebAuthn).** No passwords exist; private keys never leave the
  authenticator. RP ID/origin are enforced at verification (`RP_ID`, `ORIGIN` env).
* Registration options use `residentKey: required` (discoverable credentials), attestation
  `none`. Challenges are single-use, in-memory, 5-minute TTL.
* Credential counters are tracked and updated on each assertion (`@simplewebauthn/server`).

## Sessions

* Cookie: `gymsid`, `HttpOnly`, `SameSite=Lax`, `Secure` when ORIGIN is https; payload
  `<uid>:<expiry>:<sessionVersion>` HMAC-SHA256-signed with a per-instance 32-byte key stored
  0600 in `./data/secret`.
* Default lifetime 90 days (`SESSION_DAYS`); expiry baked at issue — lowering it never cuts
  existing sessions.
* **Revocation:** `POST /api/logout/all` bumps the user's `sv` counter → all previously issued
  cookies fail verification on every device. Disabled accounts are refused at session-read.
* Timing-safe MAC comparison; malformed payloads refused.

## Authorization

* Two levels today: authenticated user, admin (`ADMIN_UIDS` env or user flag) enforced
  server-side via `requireAdmin` on every `/api/admin/*` route.
* Users can only ever read/write their own state file — there is no endpoint accepting an
  arbitrary uid for data access.
* **MiGym obligation:** Phases 11–12 add COACH/GYM roles and tenant isolation; authorization
  must be enforced server-side on every endpoint (never client-only role checks). Design doc
  required before implementation.

## Input handling

* All bodies parsed as JSON with a hard 5 MB cap; oversized connections destroyed.
* User-controlled strings length-trimmed server-side (name ≤40, note ≤60, presence name ≤60,
  rest seconds clamped 1..3600).
* State file paths derive from validated uid pattern (`[^a-zA-Z0-9_-]` stripped) — no path
  traversal vector via uid.
* Invite codes: exact string compare only (no format assumptions), 64-bit entropy generated
  server-side.

## Transport & origin

* nginx proxies `/api` same-origin (WebAuthn requirement); HTTPS termination is the operator's
  reverse proxy (documented in docs/SELF_HOSTING.md). Cookies flip to Secure automatically
  when `ORIGIN` is https.
* No CORS headers are emitted (same-origin deployment model).

## Privacy

* Zero telemetry by default; optional Umami analytics is injected **only** when both build-time
  env vars are set (self-hosted builds stay clean).
* Push payloads contain no training data (titles/tags only).
* Web-push subscriptions stored server-side keyed to userId; endpoints pruned on 404/410.

## Known gaps / accepted risks (documented, not hidden)

1. **No rate limiting** at app layer (brute-force surface: login verify, register options).
   Mitigation is operator-side (reverse proxy). Revisit if Cloud phase serves multi-tenant traffic.
2. **Admin endpoints read every state file per request** — availability cost at scale, plus
   admin sees all users' data by design (single-instance trust model). Multi-tenant phases
   must replace this trust model entirely.
3. **No CSRF tokens**: state-changing routes rely on SameSite=Lax + JSON content type +
   custom fetch calls. Adequate for current cookie semantics; re-review when adding roles.
4. Session secret has no rotation procedure (rotating = invalidating all sessions by replacing
   `./data/secret`).
5. No audit logging of admin actions beyond console logs.

## AI coach credentials (MiGym phase 9, ADR-0004)

* Provider endpoint/model/API key live in a dedicated localStorage key
  (`migym_coach_cfg`) **outside** the synced state blob `S` — they never reach the server,
  backups or exports.
* The key is only placed in the Authorization header of the user's own request to the
  endpoint they configured; it is never logged and never embedded in prompts.
* The feature is opt-in: with no configured endpoint no request can originate from the UI.

## Secrets handling rules for contributors

* Never commit `.env`, `./data/`, keys or VAPID material (already gitignored).
* New configuration must default safe (openGym convention: permissive guest mode is explicit
  and documented; invite/admin default off).

## Verification status

These properties were reviewed by code inspection during Phase 0; there are **no automated
security tests yet**. Adding API-level tests (auth flows, authorization matrix) is a
recommended pre-Phase-1 follow-up recorded in ARCHITECTURE.md.
