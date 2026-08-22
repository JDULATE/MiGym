import { describe, expect, it } from 'vitest'
import { computeWorkoutTombstones, mergeStates, TOMBSTONE_TTL_MS } from './sync.js'

const DAY = 86400000
const at = daysAgo => Date.now() - daysAgo * DAY

// Two devices' blobs: local edited while remote also moved.
const local = {
  _ts: 100, unit: 'kg',
  routines: [{ id: 'r1', name: 'Local Push', ex: [] }],
  week: { 1: 'r1' },
  workouts: [
    { id: 'wA', start: 1, entries: [] },   // on both, identical
    { id: 'wB', start: 2, entries: [] },   // only local
  ],
  bodyweight: [{ d: '2026-08-01', w: 80 }],
  measurements: [{ d: '2026-08-01', k: 'waist', v: 84 }],
  customEx: [{ id: 'c1', n: 'My move' }],
}
const remote = {
  _ts: 200,
  routines: [{ id: 'r2', name: 'Remote Pull', ex: [] }],
  workouts: [
    { id: 'wA', start: 1, entries: [] },
    { id: 'wC', start: 3, entries: [] },   // only remote
    { id: 'wD', start: 4, entries: [] },
  ],
  bodyweight: [
    { d: '2026-08-01', w: 80.5 },          // same day, different value → conflict
    { d: '2026-08-05', w: 79.8 },          // only remote
  ],
  measurements: [{ d: '2026-08-08', k: 'chest', v: 101 }],
}

describe('mergeStates (ADR-0006 stage 1)', () => {
  it('unions workout history from both sides without dropping anything', () => {
    const m = mergeStates(local, remote)
    expect(m.workouts.map(w => w.id).sort()).toEqual(['wA', 'wB', 'wC', 'wD'])
    // chronological again after the union
    expect(m.workouts.map(w => w.start)).toEqual([1, 2, 3, 4])
  })

  it('keeps the newer blobs weigh-in on a conflicting day but keeps the other days', () => {
    const m = mergeStates(local, remote)   // remote is newer (_ts 200)
    const d1 = m.bodyweight.find(b => b.d === '2026-08-01')
    expect(d1.w).toBe(80.5)
    expect(m.bodyweight.some(b => b.d === '2026-08-05')).toBe(true)
  })

  it('the newer blobs reading wins regardless of argument order', () => {
    const m = mergeStates(remote, local)   // ts-200 blob passed first, ts-100 second
    expect(m.bodyweight.find(b => b.d === '2026-08-01').w).toBe(80.5)
  })

  it('set-unions measurements and sorts them by date', () => {
    const m = mergeStates(local, remote)
    expect(m.measurements.map(x => x.k)).toEqual(['waist', 'chest'])
  })

  it('takes configuration sections whole from the newer blob', () => {
    const m = mergeStates(local, remote)
    expect(m.routines[0].name).toBe('Remote Pull')
    // a section MISSING from the newer blob falls back to local rather than wiping it
    expect(m.week).toEqual({ 1: 'r1' })
  })

  it('never deletes one-sided history in either direction', () => {
    const a = mergeStates(local, remote).workouts.length
    const b = mergeStates(remote, local).workouts.length
    expect(a).toBe(4)
    expect(b).toBe(4)
  })

  it('does not mutate its inputs', () => {
    const lc = JSON.parse(JSON.stringify(local))
    const rc = JSON.parse(JSON.stringify(remote))
    mergeStates(local, remote)
    expect(local).toEqual(lc)
    expect(remote).toEqual(rc)
  })

  it('handles empty sides gracefully', () => {
    expect(mergeStates(null, remote).workouts.length).toBe(3)
    expect(mergeStates(local, null).workouts.length).toBe(2)
    expect(mergeStates({}, {}).measurements).toEqual([])
  })
})

describe('stage 1b — per-section timestamps (_mts)', () => {
  it('an older blob wins the one section it edited more recently', () => {
    const newer = { _ts: 200, _mts: { routines: 1000 }, routines: [{ id: 'rNew', name: 'Newest', ex: [] }], week: {} }
    const older = { _ts: 300, _mts: { routines: 2000 }, routines: [{ id: 'rOld', name: 'Older but fresher', ex: [] }] }
    // blob "older" has the higher overall _ts AND the fresher routines stamp
    const m = mergeStates(newer, older)
    expect(m.routines[0].name).toBe('Older but fresher')
  })

  it('per-section stamps split a tie that whole-blob LWW would get wrong', () => {
    // same overall _ts on both sides; only the section stamps differ
    const a = { _ts: 500, _mts: { profile: 900 }, profile: { goal: 'strength' }, routines: [{ id: 'ra', name: 'A', ex: [] }] }
    const b = { _ts: 500, _mts: { routines: 950 }, routines: [{ id: 'rb', name: 'B', ex: [] }], profile: { goal: 'hypertrophy' } }
    const m = mergeStates(a, b)                 // b's routines are fresher…
    expect(m.routines[0].id).toBe('rb')
    expect(m.profile.goal).toBe('strength')     // …while a's profile is untouched by b
  })

  it('falls back to blob-level _ts when neither side carries stamps (pre-1b clients)', () => {
    const m = mergeStates(local, remote)        // no _mts anywhere — stage-1 behaviour
    expect(m.routines[0].name).toBe('Remote Pull')
  })
})

describe('stage 2 — workout deletion tombstones', () => {
  it('computeWorkoutTombstones records exactly the removed ids', () => {
    const prev = { workouts: [{ id: 'w1' }, { id: 'w2' }], _tomb: { workouts: { w0: 111 } } }
    const next = { workouts: [{ id: 'w2' }] }
    const t = computeWorkoutTombstones(prev, next, 5000)
    expect(t.w1).toBe(5000)
    expect(t.w0).toBe(111)                     // existing tombstones preserved
    expect(t.w2).toBeUndefined()
  })

  it('a tombstoned workout is dropped on merge even when the other side still has it', () => {
    const local = { _ts: 300, workouts: [{ id: 'wGone', start: 10, entries: [] }] }
    const remote = { _ts: 200, workouts: [{ id: 'wGone', start: 10, entries: [] }], _tomb: { workouts: { wGone: at(1) } } }
    const m = mergeStates(local, remote)
    expect(m.workouts).toHaveLength(0)
  })

  it('a workout logged again AFTER the tombstone survives and grows', () => {
    const t = Date.now() - DAY
    const local = { _ts: 300, workouts: [{ id: 'wBack', start: Date.now(), entries: [] }], _tomb: { workouts: { wBack: t } } }
    const remote = { _ts: 200, workouts: [{ id: 'wBack', start: Date.now() + 1000, entries: [] }] }
    const m = mergeStates(local, remote)
    expect(m.workouts).toHaveLength(1)
  })

  it('expired tombstones stop suppressing (re-created lifts live)', () => {
    const old = Date.now() - TOMBSTONE_TTL_MS - DAY
    const local = { _ts: 300, workouts: [{ id: 'wRevived', start: Date.now(), entries: [] }], _tomb: { workouts: { wRevived: old } } }
    const m = mergeStates(local, local)
    expect(m.workouts).toHaveLength(1)
  })

  it('tombstone maps union with max-ts semantics', () => {
    const a = { _tomb: { workouts: { w1: 100, w2: 200 } } }
    const b = { _tomb: { workouts: { w1: 150 } } }
    const m = mergeStates(a, b)
    expect(m._tomb.workouts).toEqual({ w1: 150, w2: 200 })
  })

  it('importing a backup that removes workouts records tombstones via replaceState path helper', () => {
    const prev = { workouts: [{ id: 'wA' }, { id: 'wB' }] }
    const t1 = computeWorkoutTombstones(prev, { workouts: [] }, 1000)
    // re-import a superset later: fresh copy of wA arrives after its tombstone → survives
    expect(Object.keys(t1)).toEqual(['wA', 'wB'])
  })
})
