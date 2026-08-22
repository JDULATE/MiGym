import { describe, expect, it } from 'vitest'
import { exerciseMomentum, MIN_SESSIONS_FOR_MOMENTUM, MOMENTUM_BAND, trainingSummary } from './analytics.js'

const DAY = 86400000
let now = Date.now()
const at = daysAgo => now - daysAgo * DAY

function state(workouts) { return { workouts } }

// One reps entry with a single top set; est1RM from Epley: w·(1+r/30)
const benchEntry = (w, r) => ({
  id: 'bench', sets: [{ done: true, w, r }],
  target: { sets: 1, reps: r },
})

describe('trainingSummary', () => {
  it('counts windowed sessions, weekly frequency and average duration', () => {
    const S = state([
      { d: '2026-08-20', start: at(2), end: at(2) + 45 * 60000, entries: [{ id: 'bench', sets: [{ done: true, w: 60, r: 8 }] }] },
      { d: '2026-08-17', start: at(5), end: at(5) + 61 * 60000, entries: [] },
      { d: '2026-06-01', start: at(80), end: at(80) + 30 * 60000, entries: [] },   // outside 56d window
      { d: '2026-08-21', start: 0, end: 0, entries: [] },                          // untimed: ignored for duration
    ])
    const s = trainingSummary(S, 56)
    expect(s.sessions).toBe(3)
    expect(s.perWeek).toBeCloseTo(0.4, 1)
    expect(s.avgDurationMin).toBe(53)          // mean of 45 & 61
  })

  it('sums volume per week/month and counts PR sessions in the last 30 days', () => {
    const S = state([
      { d: '2026-08-19', start: at(3), end: at(3), prs: ['bench'], entries: [{ id: 'bench', sets: [{ done: true, w: 100, r: 5 }] }] },
      { d: '2026-08-12', start: at(10), end: at(10), prs: [], entries: [{ id: 'bench', sets: [{ done: true, w: 100, r: 5 }] }] },
      { d: '2026-07-02', start: at(50), end: at(50), prs: ['old'], entries: [{ id: 'bench', sets: [{ done: true, w: 90, r: 5 }] }] },
    ])
    const s = trainingSummary(S, 56)
    expect(s.weekVolume).toBe(500)             // only the last 7 days
    expect(s.monthVolume).toBeGreaterThan(0)   // calendar month includes the first two
    expect(s.prs30).toBe(1)                    // one session carrying a PR inside 30 days
  })

  it('returns zeroes and nulls — not NaN — for an empty history', () => {
    const s = trainingSummary(state([]))
    expect(s.sessions).toBe(0)
    expect(s.perWeek).toBe(0)
    expect(s.avgDurationMin).toBeNull()
    expect(s.weekVolume).toBe(0)
    expect(s.prs30).toBe(0)
  })
})

describe('exerciseMomentum', () => {
  it('calls a movement improving when recent estimates beat the earlier best beyond the band', () => {
    // 100×8 → e1RM 126.7; 110×8 → 139.3 → clearly improving
    const S = state([
      { d: '2026-07-01', start: at(50), entries: [benchEntry(100, 8)] },
      { d: '2026-07-15', start: at(36), entries: [benchEntry(102.5, 8)] },
      { d: '2026-08-10', start: at(11), entries: [benchEntry(107.5, 8)] },
      { d: '2026-08-20', start: at(1), entries: [benchEntry(110, 8)] },
    ])
    const m = exerciseMomentum(S)
    expect(m.improving).toHaveLength(1)
    expect(m.improving[0].id).toBe('bench')
    expect(m.improving[0].deltaPct).toBeGreaterThan(MOMENTUM_BAND * 100)
    expect(m.stalled).toHaveLength(0)
  })

  it('flags flat-and-abandoned movements as stalled, newest first by days since', () => {
    const mk = (id, w, days) => ({ d: '', start: at(days), entries: [benchEntry(w, 8)].map(e => ({ ...e, id })) })
    const S = state([
      mk('press', 60, 60), mk('press', 60, 46), mk('press', 60, 33), mk('press', 60, 32),
      mk('row', 70, 40), mk('row', 70, 30), mk('row', 70, 29), mk('row', 70, 28),
    ])
    const m = exerciseMomentum(S)
    expect(m.stalled.map(x => x.id)).toEqual(['press', 'row'])   // press untouched longer
    for (const x of m.stalled) expect(Math.abs(x.deltaPct)).toBeLessThanOrEqual(MOMENTUM_BAND * 100 + 0.1)
  })

  it('stays silent below the minimum session count and ignores unknown ids gracefully', () => {
    const S = state([
      { start: at(9), entries: [benchEntry(100, 8)] },
      { start: at(6), entries: [benchEntry(101, 8)] },
      { start: at(3), entries: [benchEntry(102, 8)] },
    ])
    const m = exerciseMomentum(S)
    expect(m.improving).toHaveLength(0)
    expect(m.stalled).toHaveLength(0)
    expect(m.stable).toHaveLength(0)
    expect(MIN_SESSIONS_FOR_MOMENTUM).toBeGreaterThanOrEqual(3)
  })
})
