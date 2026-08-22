import { describe, expect, it } from 'vitest'
import { entryVolume, setTonnage, volumeByExercise, weeklyVolume, workoutTonnage } from '../volume.js'

const wu = { done: true, w: 40, r: 10, phase: 'warmup' }   // warm-up: never counted
const work = (w, r, extra = {}) => ({ done: true, w, r, ...extra })

describe('setTonnage', () => {
  it('counts completed work sets only', () => {
    expect(setTonnage(work(100, 5))).toBe(500)
    expect(setTonnage({ done: false, w: 100, r: 5 })).toBe(0)
    expect(setTonnage(wu)).toBe(0)
    expect(setTonnage(null)).toBe(0)
  })
})

describe('entryVolume', () => {
  it('sums work sets and skips warm-ups and undone rows', () => {
    const e = { sets: [wu, work(100, 5), work(80, 8), { done: false, w: 60, r: 6 }] }
    expect(entryVolume(e)).toBe(500 + 640)
    expect(entryVolume(null)).toBe(0)
  })

  it('counts bodyweight tonnage as zero — honest arithmetic beats invented load', () => {
    // recovery.js may assume a reference load for *stimulus*; raw tonnage must not.
    const e = { sets: [{ done: true, w: 0, r: 20 }] }
    expect(entryVolume(e)).toBe(0)
  })
})

describe('workoutTonnage / weeklyVolume', () => {
  const S = {
    workouts: [
      { d: '2026-08-03', start: 1, entries: [{ sets: [work(100, 5)] }] },        // Mon
      { d: '2026-08-05', start: 2, entries: [{ sets: [work(50, 10)] }] },        // Wed, same week
      { d: '2026-08-11', start: 3, entries: [{ sets: [wu, work(200, 3)] }] },    // Tue next week
      { d: 'not-a-date', start: 4, entries: [{ sets: [work(999, 9)] }] },        // malformed date dropped
    ],
  }

  it('lists per-workout tonnage chronologically', () => {
    expect(workoutTonnage(S).map(x => x.vol)).toEqual([500, 500, 600])
  })

  it('buckets by Monday-starting weeks', () => {
    const weeks = weeklyVolume(S)
    expect(weeks.map(w => w.week)).toEqual(['2026-08-03', '2026-08-10'])
    expect(weeks.map(w => w.vol)).toEqual([1000, 600])
  })
})

describe('volumeByExercise', () => {
  it('totals one exercise across workouts', () => {
    const S = {
      workouts: [
        { d: '2026-08-03', entries: [{ id: '0025', sets: [work(100, 5)] }, { id: '0047', sets: [work(50, 10)] }] },
        { d: '2026-08-05', entries: [{ id: '0025', sets: [wu, work(102.5, 5)] }] },
      ],
    }
    expect(volumeByExercise(S, '0025')).toBe(1012.5)
    expect(volumeByExercise(S, '0047')).toBe(500)
    expect(volumeByExercise(S, 'missing')).toBe(0)
  })
})
