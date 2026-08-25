# ADR-0008 — Coach Marketplace

Status: accepted (2026-08-24)
Supersedes nothing; extends ADR-0007 (coach platform pairing/consent).

## Context

ADR-0007 shipped consent-based coach↔client links (pairing codes, enforced
scopes, notes). What it does not cover is **discovery**: a student looking for
a coach has no way to find one, and a coach has no way to be found. The user
wants a LinkedIn-style directory: coaches publish a profile, students browse,
and **contact happens outside the app** (WhatsApp/IG/email/web) — the platform
is the showcase, not a booking system.

Constraints inherited from the project ethos:

* Local-first (ADR-0005): browsing must not require an account or push anyone
  through onboarding. Data lives on the instance owner's server — never in a
  third-party service.
* Dependency policy (ADR-0003): no new packages. Avatar processing happens
  client-side (canvas); storage is a plain file under `DATA_DIR`.
* Free-tier hosting caveat: `/data` is ephemeral on Render's free plan, so
  profiles/avatars share the same lifecycle as every other server datum.
  Migration later = copy `DATA_DIR`.

## Decisions

1. **Public directory, zero auth.** `GET /api/marketplace/coaches` and avatar
   reads are unauthenticated and rate-limited like the rest of the API. Any
   visitor (or search engine) can browse; no login wall, matching the
   local-first "no gates" stance.
2. **Admin-approved listings.** Any signed-in user may submit a profile, which
   lands in `status: 'pending'`. An admin approves (user gets `role: 'coach'`,
   enabling the ADR-0007 linking endpoints too), rejects, or later hides an
   approved listing. Every edit resets status to `pending`.
3. **Direct external contact.** Profiles carry optional WhatsApp number,
   Instagram handle, email, and website. The directory renders them as plain
   outbound links (`wa.me`, `instagram.com/`, `mailto:`, URL) with
   `rel="noopener nofollow"`. No in-app messaging, no lead capture.
4. **Avatars without third-party storage.** The client downscales the picked
   image on a canvas (256×256 JPEG ≈ ≤200 KB) and uploads base64. The server
   validates type/size (hard cap 250 KB decoded), writes
   `DATA_DIR/avatars/<uid>.jpg`, and bumps a per-profile `avatarV` used as a
   cache-busting query param. No S3/CDN/cloud dependency.
5. **Profile payload.** `bio` (≤500 chars), `certs` (string), `tags[]`
   (specialties, ≤8×24), `langs[]` (≤6), `modality` (`online|inperson|both`),
   `rate` (free-text display string, optional), `contact{wa,ig,email,web}`.
   Everything is business-card information the coach chooses to make public.
6. **Scraping is accepted.** Published contact info is public by design;
   no reveal-gate. Rate limiting plus approval flow are the abuse controls.

## Consequences

* The instance owner takes on a moderation duty (approval queue in Admin).
* `role: 'coach'` now has two doors: operator-granted (`COACH_UIDS`) and
  marketplace approval. Both converge on the same capability set.
* Ephemeral hosting makes the marketplace unsuitable for production growth
  until persistence lands (Oracle Always Free is the standing plan); fine for
  launch scale and development.
* Out of scope, deliberately: payments, booking, reviews/ratings, in-app chat.
