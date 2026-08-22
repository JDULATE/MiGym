// Engine-level scenario tests (spec structure: tests/).
//
// Unlike the unit suites next to each module, these drive the engine across *sequences*
// of sessions — the way a lifter actually experiences it: prescribe, train, log, repeat.
// Each run() returns BOTH the prescription the screen showed before the session (`before`)
// and the one derived after logging it (`after`), which makes progression visible step by
// step and keeps sequencing bugs out of the assertions.
import { describe, expect, it } from 'vitest'
import { applyPrescription, defaultIncrement, deloadTo, nextPrescription } from '../index.js'

const CFG = { id: '0025', sets: 3, reps: 8, prog: 'linear' }   // barbell bench, chest → +2.5 kg
let day = 0

function freshState() {
  day = 0
  return { unit: 'kg', workouts: [], routines: [] }
}

function iso() {
  const d = new Date(2026, 0, 1)
  d.setDate(d.getDate() + day++ * 2)   // every other day, like a real schedule
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/** Train one session of cfg: prescribe (before), log repsPerSet as done sets, derive again (after).
    repsPerSet lands in the mode's primary field: reps / seconds / minutes. */
function run(S, cfg, repsPerSet, weightOverride) {
  const before = nextPrescription(S, cfg, null)
  const key = cfg.mode === 'time' ? 'sec' : cfg.mode === 'cardio' ? 'min' : 'r'
  const primary = cfg.mode === 'time' ? (cfg.sec || 45) : cfg.mode === 'cardio' ? (cfg.min || 20) : (cfg.reps ?? 10)
  const base = cfg.mode === 'time'
    ? { sec: primary, w: weightOverride ?? 0, done: false }
    : { w: weightOverride ?? before.weight ?? cfg.weight ?? 60, [key]: primary, done: false }
  const rows = [base]
  while (rows.length < (before.sets || cfg.sets)) rows.push({ ...base })
  const sets = applyPrescription(rows, before).map((s, i) => ({
    ...s,
    [key]: Array.isArray(repsPerSet) ? repsPerSet[i] ?? s[key] : repsPerSet,
    done: true,
  }))
  S.workouts.push({
    id: 'w' + S.workouts.length, d: iso(), start: Date.now(), end: Date.now(),
    routineId: null, name: 'Test', bw: null,
    entries: [{ id: cfg.id, target: { ...cfg }, sets }], prs: [],
  })
  return { before, after: nextPrescription(S, cfg, null) }
}

describe('linear progression trajectory', () => {
  it('advances by the lift-specific increment after a clean session and holds after a miss', () => {
    const S = freshState()
    let r = run(S, CFG, 8)                                 // baseline @60
    expect(r.before.kind).toBe('first')
    expect(r.after.kind).toBe('up')
    expect(r.after.weight).toBe(62.5)

    r = run(S, CFG, [8, 6, 8])                             // trains @62.5 with a missed set
    expect(r.after.kind).toBe('hold')
    expect(r.after.weight).toBe(62.5)

    r = run(S, CFG, 8)                                     // clean again @62.5 → advances
    expect(r.after.kind).toBe('up')
    expect(r.after.weight).toBe(65)
  })

  it('deloads by the factor onto a loadable step after three missed sessions', () => {
    const S = freshState()
    run(S, CFG, 8)                                         // baseline @60 → up to 62.5
    let r = run(S, CFG, [7, 7, 7])                         // miss 1 → hold
    expect(r.after.kind).toBe('hold')
    r = run(S, CFG, [7, 7, 7])                             // miss 2 → still holding
    expect(r.after.kind).toBe('hold')
    r = run(S, CFG, [7, 7, 7])                             // miss 3 → deload now
    expect(r.after.kind).toBe('deload')
    const step = defaultIncrement(CFG.id, 'kg')
    expect(r.after.weight).toBe(deloadTo(62.5, step))
    expect(r.after.weight).toBeLessThan(62.5)
    expect(r.after.weight % step).toBe(0)
    expect(r.after.weight).toBeGreaterThanOrEqual(step)
  })

  it('never lets a fallen-apart session advance the load', () => {
    const S = freshState()
    run(S, CFG, [3, 0, 0])
    const p = nextPrescription(S, CFG, null)
    expect(['hold', 'deload']).toContain(p.kind)
    if (p.kind === 'hold') expect(p.weight).toBeLessThanOrEqual(60)
  })
})

describe('double progression trajectory', () => {
  const DP = { id: '0047', sets: 3, reps: 10, repsMin: 8, prog: 'double' }

  it('walks to the top of the range before adding weight, then resets reps to the bottom', () => {
    const S = freshState()
    const r = run(S, DP, [10, 10, 10])                     // baseline @60
    expect(r.before.kind).toBe('first')
    expect(r.after.kind).toBe('up')
    expect(r.after.weight).toBe(62.5)
    expect(r.after.reps).toBe(8)                           // back to the bottom of the range
  })

  it('aims one above your lowest set while you work back through the range', () => {
    const S = freshState()
    run(S, DP, [10, 10, 10])
    run(S, DP, [8, 8, 8])                                  // bottom of range at the new weight
    const p = nextPrescription(S, DP, null)
    expect(p.kind).toBe('hold')
    expect(p.weight).toBe(62.5)
    expect(p.reps).toBe(9)                                 // lowest was 8 → aim 9
  })
})

describe('bodyweight trajectory', () => {
  const BW = { id: '0499', sets: 2, reps: 20, bodyweight: true, prog: 'linear' }

  it('progresses in reps while headroom remains', () => {
    const S = freshState()
    const r = run(S, BW, [20, 20], 0)
    expect(r.after.kind).toBe('up')
    expect(r.after.weight).toBe(0)
    expect(r.after.reps).toBe(21)
  })

  it('adds a set instead of a rep past the ceiling, then advises load or variation', () => {
    const S = freshState()
    const capped = { ...BW, reps: 22, repsMax: 22 }
    const r = run(S, capped, [22, 22], 0)
    expect(r.after.kind).toBe('up')
    expect(r.after.sets).toBe(3)
    expect(r.after.reps).toBeLessThanOrEqual(22)
  })
})

describe('time policy trajectory', () => {
  const HOLD = { id: '0100', sets: 3, sec: 45, mode: 'time', prog: 'time' }

  it('adds seconds when every hold reaches the target', () => {
    const S = freshState()
    const r = run(S, HOLD, [45, 45, 45])
    expect(r.after.kind).toBe('up')
    expect(r.after.sec).toBe(50)
  })

  it('holds the same target after a short hold', () => {
    const S = freshState()
    const r = run(S, HOLD, [40, 45, 45])
    expect(r.after.kind).toBe('hold')
    expect(r.after.sec).toBe(45)
  })
})

describe('engine invariants', () => {
  it('prescriptions never change logged history', () => {
    const S = freshState()
    run(S, CFG, 8)
    const before = JSON.stringify(S.workouts)
    nextPrescription(S, CFG, null)
    applyPrescription([{ w: 60, r: 8, done: false }], { weight: 65, kind: 'up' })
    expect(JSON.stringify(S.workouts)).toBe(before)
  })

  it('is deterministic — same history, same answer', () => {
    const build = () => {
      const S = freshState()
      run(S, CFG, 8)
      run(S, CFG, [8, 6, 8])
      return nextPrescription(S, CFG, null)
    }
    expect(build()).toEqual(build())
  })
})
