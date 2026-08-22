import { describe, expect, it } from 'vitest'
import {
  EMPTY_PROFILE, EQUIPMENT, EXPERIENCE, GOALS, MEASUREMENT_KEYS,
  latestMeasurement, normalizeMeasurements, normalizeProfile, profileSummary
} from './profile.js'

describe('normalizeProfile', () => {
  it('falls back to a fully empty profile for garbage input', () => {
    expect(normalizeProfile(null)).toEqual(EMPTY_PROFILE)
    expect(normalizeProfile('nope')).toEqual(EMPTY_PROFILE)
    expect(normalizeProfile([1, 2])).toEqual(EMPTY_PROFILE)
  })

  it('keeps every valid field', () => {
    const p = normalizeProfile({
      name: '  Ana  ', goal: 'hypertrophy', experience: 'beginner',
      daysPerWeek: 4, sessionMinutes: 60, heightCm: 172,
      equipment: ['barbell', 'dumbbell'], preferences: 'mornings', image: 'data:image/jpeg;base64,abc'
    })
    expect(p.name).toBe('Ana')
    expect(p.goal).toBe('hypertrophy')
    expect(p.experience).toBe('beginner')
    expect(p.daysPerWeek).toBe(4)
    expect(p.sessionMinutes).toBe(60)
    expect(p.heightCm).toBe(172)
    expect(p.equipment).toEqual(['barbell', 'dumbbell'])
    expect(p.preferences).toBe('mornings')
    expect(p.image.startsWith('data:image/')).toBe(true)
  })

  it('rejects out-of-vocabulary enums and out-of-range numbers', () => {
    const p = normalizeProfile({
      goal: 'beach muscles', experience: 'elite', daysPerWeek: 12,
      sessionMinutes: 9999, heightCm: 3
    })
    expect(p.goal).toBeNull()
    expect(p.experience).toBeNull()
    expect(p.daysPerWeek).toBeNull()
    expect(p.sessionMinutes).toBeNull()
    expect(p.heightCm).toBeNull()
  })

  it('drops equipment values outside the known vocabulary and dedupes', () => {
    const p = normalizeProfile({ equipment: ['barbell', 'barbell', 'magic wand'] })
    expect(p.equipment).toEqual(['barbell'])
    expect(() => EQUIPMENT.includes('magic wand')).not.toThrow()
  })

  it('refuses oversized or non-image data URLs', () => {
    const p = normalizeProfile({ image: 'data:image/png;base64,' + 'x'.repeat(300000) })
    const q = normalizeProfile({ image: 'http://example.com/pic.jpg' })
    expect(p.image).toBeNull()
    expect(q.image).toBeNull()
  })

  it('normalises age within a sensible range and rejects the rest', () => {
    expect(normalizeProfile({ ageYears: 30 }).ageYears).toBe(30)
    expect(normalizeProfile({ ageYears: '17' }).ageYears).toBe(17)
    expect(normalizeProfile({ ageYears: 5 }).ageYears).toBeNull()
    expect(normalizeProfile({ ageYears: 150 }).ageYears).toBeNull()
    expect(normalizeProfile({}).ageYears).toBeNull()
  })

  it('truncates over-long name and preferences instead of storing them', () => {
    const p = normalizeProfile({ name: 'x'.repeat(500), preferences: 'y'.repeat(2000) })
    expect(p.name.length).toBeLessThanOrEqual(60)
    expect(p.preferences.length).toBeLessThanOrEqual(500)
  })
})

describe('normalizeMeasurements', () => {
  it('keeps only well-formed records', () => {
    const log = normalizeMeasurements([
      { d: '2026-08-01', k: 'waist', v: 80 },
      { d: '2026-08-02', k: 'toe', v: 10 },        // unknown key
      { d: '08/02/2026', k: 'waist', v: 81 },      // bad date
      { d: '2026-08-03', k: 'chest', v: -5 },      // impossible value
      { d: '2026-08-03', k: 'chest', v: 4000 },    // beyond bound
      null, 'nope',
      { d: '2026-08-04', k: 'thigh', v: 60.5 }
    ])
    expect(log).toEqual([
      { d: '2026-08-01', k: 'waist', v: 80 },
      { d: '2026-08-04', k: 'thigh', v: 60.5 }
    ])
  })

  it('sorts newest last regardless of input order', () => {
    const log = normalizeMeasurements([
      { d: '2026-08-10', k: 'waist', v: 79 },
      { d: '2026-08-01', k: 'waist', v: 80 }
    ])
    expect(log.map(m => m.d)).toEqual(['2026-08-01', '2026-08-10'])
  })

  it('drops exact duplicate readings but keeps same-day different readings', () => {
    const log = normalizeMeasurements([
      { d: '2026-08-01', k: 'waist', v: 80 },
      { d: '2026-08-01', k: 'waist', v: 80 },
      { d: '2026-08-01', k: 'waist', v: 80.5 }
    ])
    expect(log.length).toBe(2)
  })

  it('never mutates the caller’s array', () => {
    const raw = [{ d: '2026-08-10', k: 'waist', v: 79 }, 'junk']
    const copy = JSON.parse(JSON.stringify(raw))
    normalizeMeasurements(raw)
    expect(raw).toEqual(copy)
  })
})

describe('latestMeasurement', () => {
  it('returns the newest reading per key', () => {
    const log = [
      { d: '2026-08-01', k: 'waist', v: 80 },
      { d: '2026-08-05', k: 'waist', v: 79 },
      { d: '2026-08-03', k: 'chest', v: 100 }
    ]
    expect(latestMeasurement(log, 'waist').v).toBe(79)
    expect(latestMeasurement(log, 'chest').v).toBe(100)
    expect(latestMeasurement(log, 'calf')).toBeNull()
    expect(latestMeasurement(null, 'waist')).toBeNull()
  })
})

describe('profileSummary', () => {
  it('joins the set fields in a stable order', () => {
    expect(profileSummary({ goal: 'weight_loss', experience: 'beginner', daysPerWeek: 3 }))
      .toBe('weight loss · beginner · 3/wk')
    expect(profileSummary(normalizeProfile(null))).toBe('')
  })
})

describe('constants', () => {
  it('cover the spec goals and measurement sites', () => {
    expect(GOALS).toEqual(['hypertrophy', 'strength', 'weight_loss', 'general', 'performance'])
    expect(EXPERIENCE).toEqual(['beginner', 'intermediate', 'advanced'])
    for (const k of ['neck', 'chest', 'waist', 'hips', 'upper_arm', 'thigh', 'calf']) {
      expect(MEASUREMENT_KEYS).toContain(k)
    }
  })
})
