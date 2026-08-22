import { describe, expect, it } from 'vitest'
import { ADHERENCE_WINDOW_DAYS, adaptiveSuggestions, CONFIRM_SESSIONS, RIR_TOLERANCE } from './adaptive.js'

const DAY = 86400000
const at = daysAgo => Date.now() - daysAgo * DAY
let n = 0
const iso = daysAgo => { const d = new Date(at(daysAgo)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

// bench: chest → default increment 2.5 kg (kg profile)
// rirTarget = what the PLAN asks for; rir = what the LIFTER logged.
const entry = (w, r, rir, rirTarget) => ({
  id: '0025',
  target: { sets: 3, reps: 8, ...(rirTarget != null ? { rirTarget } : {}) },
  sets: Array.from({ length: 3 }, () => ({ done: true, w, r, ...(rir != null ? { rir } : {}) })),
})
const workout = (daysAgo, entries) => ({ id: 'w' + (++n), d: iso(daysAgo), start: at(daysAgo), end: at(daysAgo), entries })
const S = workouts => ({ unit: 'kg', workouts, profile: {} })

describe('increase suggestions', () => {
  it('recommends the load bump after two clean sessions inside the target RIR', () => {
    const s = S([
      workout(10, [entry(70, 8, 2, 2)]),
      workout(6, [entry(70, 8, 2, 2)]),
      workout(2, [entry(70, 8, 2, 2)]),
    ])
    const inc = adaptiveSuggestions(s).items.find(i => i.key === 'increase' && i.exId === '0025')
    expect(inc).toBeTruthy()
    expect(inc.title[0]).toBe('Raise {0} to {1} {2}.')   // template, untranslated here
    expect(inc.title[2]).toBe(72.5)
    expect(inc.why[0]).toContain('target RIR')
  })

  it('suggests increases even with no progression policy — this is that lift’s engine', () => {
    const s = S([workout(10, [{ ...entry(80, 8), target: { sets: 3, reps: 8, prog: 'off' } }]), workout(3, [{ ...entry(80, 8), target: { sets: 3, reps: 8, prog: 'off' } }])])
    expect(adaptiveSuggestions(s).items.some(i => i.key === 'increase')).toBe(true)
  })

  it('stays quiet when effort ran above the target (too easy is still not earned)', () => {
    // plan asks RIR ≤ 2, lifter reports 4 — plenty of headroom, hold the line
    const s = S([workout(9, [entry(70, 8, 4, 2)]), workout(5, [entry(70, 8, 4, 2)]), workout(1, [entry(70, 8, 4, 2)])])
    expect(adaptiveSuggestions(s).items.filter(i => i.key === 'increase')).toHaveLength(0)
  })

  it('requires two agreeing sessions and real effort coverage', () => {
    expect(CONFIRM_SESSIONS).toBe(2)
    const unrated = S([workout(10, [entry(70, 8)]), workout(2, [entry(70, 8)])])
    // No ratings anywhere: increase still fires (policy-less lift), but without an RIR claim
    const items = adaptiveSuggestions(unrated).items.filter(i => i.key === 'increase')
    expect(items).toHaveLength(1)
    expect(items[0].why[0]).not.toContain('target RIR')
    expect(RIR_TOLERANCE).toBeGreaterThanOrEqual(0)
  })
})

describe('ease suggestions', () => {
  it('steps the load back when reps land short while grinding past the RIR target', () => {
    // target RIR 3, logged RIR 0 → 0 <= 3-1-1 → ease; last session missed reps
    const s = S([workout(10, [entry(80, 8, 3, 3)]), workout(6, [entry(82.5, 8, 2, 3)]), workout(2, [entry(85, 5, 0, 3)])])
    const e = adaptiveSuggestions(s).items.find(i => i.key === 'ease')
    expect(e).toBeTruthy()
    expect(e.exId).toBe('0025')
  })

  it('does not nag about a normal miss at or near the planned effort', () => {
    const s = S([workout(8, [entry(80, 8, 3, 3)]), workout(4, [entry(82.5, 7, 2, 3)]), workout(1, [entry(82.5, 6, 2, 3)])])
    expect(adaptiveSuggestions(s).items.filter(i => i.key === 'ease')).toHaveLength(0)
  })
})

describe('review + adherence', () => {
  it('flags long-flat long-untouched movements for review', () => {
    const mk = days => workout(days, [{ id: '0043', target: { sets: 3, reps: 8 }, sets: [{ done: true, w: 100, r: 8 }] }])
    const s = S([mk(60), mk(45), mk(44), mk(43)])
    const rev = adaptiveSuggestions(s).items.filter(i => i.key === 'review')
    expect(rev.length).toBeGreaterThan(0)
    expect(rev[0].title[0]).toContain('deload')
  })

  it('nudges once when reality falls well short of the planned frequency', () => {
    const s = S([{ ...workout(20, []), prs: [] }, { ...workout(10, []) }])
    s.profile = { daysPerWeek: 4 }
    const a = adaptiveSuggestions(s).items.filter(i => i.key === 'adhere')
    expect(a).toHaveLength(1)
  })

  it('returns nothing at all for an empty history', () => {
    expect(adaptiveSuggestions(S([])).items).toEqual([])
    expect(ADHERENCE_WINDOW_DAYS).toBeGreaterThan(0)
  })
})
