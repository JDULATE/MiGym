import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCoachContext, buildMessages, chatUrl, coachConfigured,
  DEFAULT_PROVIDER, loadCoachCfg, saveCoachCfg, systemPrompt,
} from './coach.js'

const S = () => JSON.parse(JSON.stringify({
  unit: 'kg',
  profile: { goal: 'strength', experience: 'intermediate', daysPerWeek: 3, equipment: ['barbell'] },
  bodyweight: [{ d: '2026-08-01', w: 80 }, { d: '2026-08-15', w: 79 }],
  routines: [{ id: 'r1', name: 'Push', ex: [{ id: '0025', sets: 3, reps: 8, weight: 70 }] }],
  workouts: [{
    id: 'w1', d: '2026-08-20', start: Date.now(), end: Date.now() + 45 * 60000, name: 'Push',
    entries: [{ id: '0025', note: 'pause at bottom', sets: [{ done: true, w: 72.5, r: 8, rir: 2 }, { done: false, w: 72.5, r: 8 }] }],
    prs: ['0025'],
  }],
}))

describe('provider config storage', () => {
  beforeEach(() => {
    const store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: k => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('falls back to defaults when nothing or garbage is stored', () => {
    expect(loadCoachCfg()).toEqual(DEFAULT_PROVIDER)
    localStorage.setItem('migym_coach_cfg', '{not json')
    expect(loadCoachCfg()).toEqual(DEFAULT_PROVIDER)
  })

  it('round-trips a cleaned config and reports configured state honestly', () => {
    saveCoachCfg({ baseUrl: 'http://localhost:11434/v1/', model: ' llama3 ', key: 'sk-test' })
    const cfg = loadCoachCfg()
    expect(cfg.baseUrl).toBe('http://localhost:11434/v1')     // trailing slash normalised
    expect(cfg.model).toBe('llama3')
    expect(coachConfigured(cfg)).toBe(true)
    expect(coachConfigured({ ...cfg, model: '' })).toBe(false)
  })
})

describe('chatUrl', () => {
  it('appends the completions path exactly once', () => {
    expect(chatUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1/chat/completions')
    expect(chatUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1/chat/completions')
  })
})

describe('buildCoachContext', () => {
  it('separates recorded facts from computed metrics', () => {
    const ctx = buildCoachContext(S())
    expect(ctx.facts.totalWorkoutsLogged).toBe(1)
    expect(ctx.facts.routines[0].exercises[0].prescription).toContain('3×8')
    expect(ctx.facts.recentWorkouts[0].exercises[0].note).toBe('pause at bottom')
    // undone sets are not presented as if they happened
    expect(ctx.facts.recentWorkouts[0].exercises[0].sets).toHaveLength(1)
    expect(typeof ctx.computed.volumeLast7Days).toBe('number')
    expect(Array.isArray(ctx.computed.suggestionsFromRules)).toBe(true)
  })

  it('bounds long histories to the recent window', () => {
    const s = S()
    for (let i = 0; i < 30; i++) s.workouts.push({ id: 'w' + i, d: '2026-01-' + String((i % 28) + 1).padStart(2, '0'), start: i, end: i + 1, entries: [] })
    expect(buildCoachContext(s).facts.recentWorkouts.length).toBeLessThanOrEqual(8)
  })
})

describe('prompt guardrails', () => {
  it('states the non-negotiable rules in the system prompt', () => {
    const p = systemPrompt('German')
    for (const needle of ['ONLY the data provided', 'Never invent', 'Recorded facts:', 'not a doctor', 'never contradict', 'Answer in German']) {
      expect(p).toContain(needle)
    }
    expect(buildMessages({ a: 1 }, 'Why is my bench stuck?', 'German')).toEqual([
      { role: 'system', content: p },
      { role: 'user', content: expect.stringContaining('"a":1') },
      { role: 'user', content: 'Why is my bench stuck?' },
    ])
  })
})
