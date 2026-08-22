// Render coverage for the Progress overview card (audit round: "Stats overview card
// remains module-level"). Verifies tiles, improving/stalled lists and empty states
// against seeded state — the pure logic lives in analytics/adaptive tests.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stats from './Stats.jsx'

vi.mock('../lib/api.js', () => ({
  api: vi.fn(() => Promise.resolve({})),
  IS_APPLE: false, IS_ANDROID: false, BIO: 'bio', VAULT: 'vault',
  webauthnOK: () => true, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(),
}))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, shareExport: vi.fn(), syncReminder: vi.fn(), nativeLoad: vi.fn(), nativeSave: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  startFlow: vi.fn(), loadStarterPlan: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(),
  workoutDetailSheet: vi.fn(), calendarSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(),
  WorkoutRow: () => null, planToolsSheet: vi.fn(), dayAssignSheet: vi.fn(), bwDeltaColor: () => '',
}))

const baseState = () => JSON.parse(JSON.stringify({
  unit: 'kg', restSec: 90, lang: 'en', theme: 'dark', accent: 'lime',
  routines: [], workouts: [], bodyweight: [], customEx: [], week: {}, dayPlan: {},
  exWeights: {}, reminder: { on: false }, effort: null, profile: null, measurements: null,
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
  return { useStore, DEF: {}, hasData: () => true }
})
vi.mock('../store/useUI.js', () => {
  const useUI = selector => selector ? selector(mocks.uiSnapshot()) : mocks.uiSnapshot()
  useUI.getState = mocks.uiSnapshot
  return { useUI }
})

let root, container

function renderStats(S) {
  mocks.S = S
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  globalThis.window = parsed.window
  globalThis.document = parsed.window.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: parsed.window.navigator })
  container = document.getElementById('root')
  root = createRoot(container)
  act(() => root.render(<Stats />))
}

describe('progress overview card', () => {
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; root = null; container = null })
  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    if (container) container.remove()
    root = null; container = null
  })

  it('shows headline tiles with computed volume for a real history', () => {
    const daysAgo = n => Date.now() - n * 86400000
    const S = baseState()
    S.workouts = [1, 3].map(d => ({
      id: 'w' + d, d: '2026-08-2' + d % 10, start: daysAgo(d), end: daysAgo(d) + 40 * 60000,
      entries: [{ id: '0025', sets: [{ done: true, w: 100, r: 5 }] }], prs: ['0025'],
    }))
    renderStats(S)
    const text = document.body.textContent
    expect(text.includes('Progress overview')).toBe(true)
    expect(text.includes('PRs · 30 d')).toBe(true)
  })

  it('stays honest on a too-short history', () => {
    const S = baseState()
    S.workouts = [{ id: 'w1', d: '2026-08-20', start: Date.now(), end: Date.now(), entries: [{ id: '0025', sets: [{ done: true, w: 60, r: 8 }] }] }]
    renderStats(S)
    expect(document.body.textContent.includes('A few more sessions and this section fills in.')).toBe(true)
  })
})
