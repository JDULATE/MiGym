# ADR-0007 — Coach platform: roles, consent-based links, server-enforced scopes

Date: 2026-08-22 · Status: Accepted · Phase: 11

## Context

Coaches need to see client training. The API currently knows two levels (authenticated
user, admin) and serves data only to its owner. The spec demands: USER/COACH/ADMIN roles,
client-controlled data sharing, explicit authorization (never client-only checks), and
notes/review/adherence for coaches.

## Decision

1. **Roles**: `user.role ∈ { user, coach }` stored server-side (admin stays env/flag
   based and outranks everything). Role is set by the operator today (`ROLE_UIDS_COACH`
   env or direct db edit); there is no self-service upgrade.
2. **Consent flow — pairing codes, pull-based** (no coach-initiated invitations to accept):
   * Client generates a short-lived pairing code in Settings and hands it to the coach.
   * Coach redeems the code; a **link** `{coachId, clientId, scope, notes[]}` is created.
   * Either side can unlink at any time; unlinking is immediate and unilateral.
3. **Scopes enforced server-side**, never by hiding UI:
   * `summary` — derived numbers only (workout count, last session date, weekly frequency,
     streak, volume totals). Never individual sets.
   * `full` — summary plus finished workouts and their sets (still excludes profile
     PII beyond display name and never includes future plans unless phase 12 adds it).
4. **Transparency**: the client always sees every link (who, scope, since) and the notes
   coaches wrote; nothing is hidden from the person the data belongs to.
5. **Notes** live on the link record, visible to both sides.
6. **Deferred to phase 12** (documented): assigning/modifying routines — writing INTO a
   client's state needs its own consent-and-acceptance protocol and is not squeezed into
   this phase.

## Consequences

* `db.json` gains `links[]`; all `/api/coach/*` routes resolve the caller's session and
  re-verify the link on every request.
* Scope filtering happens before serialization: summary responses are computed, not
  redacted copies of the state blob.
* Tests use the real HTTP server over a temp DATA_DIR with hand-minted session cookies
  (node:test, zero new dependencies).
