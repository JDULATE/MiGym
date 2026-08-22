import { describe, expect, it } from 'vitest'
import { mergeStates } from './sync.js'

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
