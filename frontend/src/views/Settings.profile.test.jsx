// Settings' fitness-profile section (MiGym phase 2): the rows read normalized profile data,
// show sensible fallbacks when it is empty, and reflect what the state holds when it isn't.
// Sheet internals are exercised through the pure lib (see profile.test.js) — here we verify
// the wiring: state in, rows out.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings.jsx'

vi.mock('../lib/api.js', () => ({
  api: vi.fn(() => Promise.resolve({})),
  IS_APPLE: false, IS_ANDROID: false, BIO: 'biometrics', VAULT: 'vault',
  webauthnOK: () => true, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(),
}))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, shareExport: vi.fn(), syncReminder: vi.fn(), nativeLoad: vi.fn(), nativeSave: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  startFlow: vi.fn(), loadStarterPlan: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(),
}))

const baseState = () => JSON.parse(JSON.stringify({
  unit: 'kg', restSec: 90, sound: true, lang: 'en', theme: 'dark', accent: 'lime',
  routines: [], workouts: [], bodyweight: [], customEx: [], week: {}, dayPlan: {},
  exWeights: {}, reminder: { on: false }, effort: null,
  profile: null, measurements: null,
}))

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.storeSnapshot = () => ({
    S: state.S, user: null, ready: true, config: null,
    update: mut => mut(state.S),
    replaceState: vi.fn(), setUser: vi.fn(), pullState: vi.fn(), pushState: vi.fn(),
    signOut: vi.fn(), signOutAll: vi.fn(), resetDemo: vi.fn(),
  })
  state.uiSnapshot = () => ({ toast: vi.fn(), openSheet: vi.fn(), sheets: [] })
  return state
})

vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.storeSnapshot()) : mocks.storeSnapshot()
  useStore.getState = mocks.storeSnapshot
  return { useStore, DEF: {}, hasData: () => false }
})
vi.mock('../store/useUI.js', () => {
  const useUI = selector => selector ? selector(mocks.uiSnapshot()) : mocks.uiSnapshot()
  useUI.getState = mocks.uiSnapshot
  return { useUI }
})

let root, container

function renderSettings(S) {
  mocks.S = S
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  globalThis.window = parsed.window
  globalThis.document = parsed.window.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: parsed.window.navigator })
  container = document.getElementById('root')
  root = createRoot(container)
  act(() => root.render(<Settings />))
}

describe('fitness profile section', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    root = null; container = null
  })
  afterEach(() => {
    if (root) act(() => root.unmount())
    if (container) container.remove()
    root = null; container = null
  })

  it('offers setup with fallbacks when the profile is untouched', () => {
    renderSettings(baseState())
    const text = document.body.textContent
    expect(text.includes('Set up your fitness profile')).toBe(true)
    expect(text.includes('Training goal')).toBe(true)
    expect(text.includes('Available equipment')).toBe(true)
    expect(text.includes('Neck, waist, arms — logged over time, never overwritten.')).toBe(true)
  })

  it('shows the summary line once goal/experience/frequency are set', () => {
    const S = baseState()
    S.profile = { goal: 'hypertrophy', experience: 'intermediate', daysPerWeek: 4 }
    renderSettings(S)
    expect(document.body.textContent.includes('hypertrophy · intermediate · 4/wk')).toBe(true)
  })

  it('reflects stored height and measurement log size', () => {
    const S = baseState()
    S.profile = { goal: 'strength', heightCm: 178 }
    S.measurements = [
      { d: '2026-08-01', k: 'waist', v: 84 },
      { d: '2026-08-08', k: 'waist', v: 83.5 },
      { d: '2026-08-08', k: 'chest', v: 101 },
    ]
    renderSettings(S)
    expect(document.body.textContent.includes('3 readings')).toBe(true)
    expect([...document.body.querySelectorAll('input')].some(i => i.value === '178')).toBe(true)
    // the strength row's value label comes through SelectRow's current-option lookup
    expect(document.body.textContent.includes('Strength')).toBe(true)
  })
})
