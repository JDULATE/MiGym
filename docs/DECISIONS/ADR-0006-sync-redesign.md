# ADR-0006 — Sync redesign: snapshot-protected, union-first merge (staged)

Date: 2026-08-22 · Status: Accepted (Stage 1 scoped; implementation gated on review)
Supersedes the whole-state last-write-wins behaviour described in the Phase 0 audit.

## Context

Today's sync is `PUT /api/data` of the entire state blob with `_ts` last-write-wins.
Two devices editing concurrently lose one side silently. The local-first product decision
(ADR-0005) makes the device base authoritative, so destructive server-side overwrites are
unacceptable. The storage engine stays JSON files (ADR-0002) — the redesign must not
require new infrastructure.

## Decision — three stages

### Stage 0 (shipped, phase 10 part 1)
* Device base is authoritative; link/unlink semantics; final push before unlink;
  offline work preserved via the dirty flag.

### Stage 1 — snapshot protection + union merge (next implementation)
1. **Server keeps snapshots**: before accepting a `PUT /api/data`, copy the previous blob
   to a bounded per-user snapshot list (keep 10). Every LWW accident becomes reversible.
2. **Union merge for append-only collections** on pull:
   * `workouts`: union by workout `id` (a finished workout is immutable in practice —
     corrections create new prescriptions, never rewrite history).
   * `bodyweight`: keyed by date `d`; per date, the entry from the side with newer `_ts`.
   * `measurements`: set-union of records `{d,k,v}` (append-only by design since phase 2).
   * `customEx`: union by id.
3. **Config sections stay LWW but get section timestamps**: `routines`, `week`, `dayPlan`,
   `exWeights`, `profile`, and scalar settings each carry an entry in `S._mts`
   (`{ section: ts }`), stamped client-side at write time. On conflict, newer section wins
   **per section**, not per blob — a routine edit no longer clobbers a weigh-in made on
   the other device.
4. `active` continues to never sync.

### Stage 2 — only if Stage 1 proves insufficient
Per-record ops journal (create/update/delete with tombstones) replacing section blobs for
`workouts`. Explicitly deferred: CRDTs. Nothing in MiGym's data model needs them once
history is immutable-by-construction.

## Migration

* Old blobs without `_mts` merge as today (LWW) until each device pushes once with
  `_mts` present; missing entries default to `0` so first write after upgrade wins —
  acceptable because Stage 1 snapshots make any mistake recoverable.
* No server schema change beyond the snapshots directory.

## Consequences

* Concurrent-device data loss drops to "one click away from recovery" immediately, then to
  "structurally impossible" for history collections.
* Payload stays one blob (no protocol break); clients older than v2 simply keep working
  through the LWW path while newer ones opt in via the `baseTs` field (CLOUD_DESIGN.md §4).
* Tests required before enabling: union-merge property tests (commutativity/idempotence),
  section-timestamp conflict matrix, snapshot restore round-trip.
