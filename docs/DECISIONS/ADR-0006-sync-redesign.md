# ADR-0006 — Sync redesign: snapshot-protected, union-first merge (staged)

Date: 2026-08-22 · Status: **Stages 1, 1b and 2 implemented** (Stage 2 scoped to workout
tombstones; per-record ops journal beyond that remains deferred)

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

### Stage 1b — per-section timestamps (implemented)
Every write stamps `S._mts[section] = ts` for the sections that actually changed
(routines / week / dayPlan / exWeights / profile / settings, diff-based). The merge picks
each section from whichever side edited it most recently; blob `_ts` remains the fallback
for pre-1b clients. A routine edit no longer clobbers a weigh-in made on the other device.

### Stage 2 — workout deletion tombstones (implemented)
Wholesale state replacement (backup import, reset) records removed workout ids in
`S._tomb.workouts` (`id → deletion ts`). Merges suppress tombstoned copies whose session
predates the deletion; a workout logged again later survives; entries expire after 180
days. Tombstone maps union with max-ts semantics. A full per-record ops journal beyond
deletions stays deferred — nothing else in the data model deletes.

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
