import { describe, expect, it } from 'vitest'
import { EXIDX } from './exercises.js'
import { STARTER_TEMPLATES, buildStarterTemplate, starterRoutines } from './starter.js'

describe('starter templates', () => {
  it('offers the spec catalogue (PPL / Upper-Lower / Full Body) as starting points', () => {
    expect(STARTER_TEMPLATES.map(t => t.key)).toEqual(['ppl', 'ul', 'fb'])
  })

  it('builds routines whose every exercise exists in the library', () => {
    for (const t of STARTER_TEMPLATES) {
      const { routines } = t.build()
      expect(routines.length).toBeGreaterThan(0)
      for (const r of routines) {
        expect(r.ex.length).toBeGreaterThan(3)
        for (const e of r.ex) {
          expect(EXIDX[e.id], `${t.key}: ${r.name} references unknown exercise ${e.id}`).toBeTruthy()
          expect(e.sets).toBeGreaterThan(0)
          if (!EXIDX[e.id].bp.includes('cardio')) expect(e.reps).toBeGreaterThan(0)
        }
      }
    }
  })

  it('maps the default week onto the routines it just built', () => {
    const { week } = buildStarterTemplate('ppl')
    expect(Object.values(week).every(i => i < 3)).toBe(true)
    const fb = buildStarterTemplate('fb')
    expect(fb.week[1]).toBe(0)
    expect(fb.week[4]).toBe(0)             // the same full-body routine twice a week
  })

  it('hands back fresh ids every build and rejects unknown keys', () => {
    const a = buildStarterTemplate('ul')
    const b = buildStarterTemplate('ul')
    expect(a.routines[0].id).not.toBe(b.routines[0].id)
    expect(buildStarterTemplate('nope')).toBeNull()
  })

  it('keeps starterRoutines as the PPL triple (demo seed depends on it)', () => {
    const [push, pull, legs] = starterRoutines()
    expect(push.name).toBe('Push Day')
    expect(pull.name).toBe('Pull Day')
    expect(legs.name).toBe('Leg Day')
  })
})
