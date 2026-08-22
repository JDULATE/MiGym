// @vitest-environment happy-dom
// Local-first boot & unlink semantics (MiGym phase 10): the app must come up usable with
// no server at all, and unlinking must never touch the local base.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: mocks.api, webauthnOK: () => true }))

import { useStore, hasData } from './useStore.js'

const linkedState = () => ({
  _ts: 200,
  unit: 'kg',
  routines: [{ id: 'r1', name: 'Push', ex: [] }],
  workouts: [{ id: 'w1', d: '2026-08-20', entries: [] }],
  bodyweight: [],
})

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ S: JSON.parse(JSON.stringify(useStore.getState().S)), user: null, ready: false })
})

describe('local-first boot', () => {
  it('comes up ready and unlinked when no server answers', async () => {
    // seed local data directly into the store (the app would have persisted it earlier)
    useStore.setState({ S: linkedState() })
    mocks.api.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }))
    await useStore.getState().boot()
    const st = useStore.getState()
    expect(st.ready).toBe(true)
    expect(st.user).toBeNull()
    expect(hasData(st.S)).toBe(true)                       // local base intact
    expect(st.S.routines[0].name).toBe('Push')
  })

  it('restores a still-valid link and pulls its copy on boot', async () => {
    mocks.api.mockImplementation((path, opts) => {
      if (path === '/api/me') return Promise.resolve({ user: { id: 'u1', name: 'Ana' } })
      if (path === '/api/data') return Promise.resolve({ state: { ...linkedState(), routines: [{ id: 'r1', name: 'Pulled Push', ex: [] }] } })
      return Promise.reject(new Error('unexpected ' + path))
    })
    await useStore.getState().boot()
    const st = useStore.getState()
    expect(st.user?.id).toBe('u1')
    expect(st.S.routines[0].name).toBe('Pulled Push')      // server copy applied
  })

  it('treats a 401 as "no link" without touching local data', async () => {
    useStore.setState({ S: linkedState() })
    mocks.api.mockRejectedValue(Object.assign(new Error('no session'), { status: 401 }))
    await useStore.getState().boot()
    const st = useStore.getState()
    expect(st.ready).toBe(true)
    expect(st.user).toBeNull()
    expect(hasData(st.S)).toBe(true)
  })
})

describe('unlink keeps the local base', () => {
  it('signOut pushes a final backup, clears the link, and leaves S exactly as it was', async () => {
    useStore.setState({ S: linkedState(), user: { id: 'u1', name: 'Ana' } })
    mocks.api.mockResolvedValue({ ok: true })
    await useStore.getState().signOut()
    const st = useStore.getState()
    expect(st.user).toBeNull()
    expect(hasData(st.S)).toBe(true)                       // THE data stays
    expect(st.S.routines[0].id).toBe('r1')
    expect(localStorage.getItem('gym_dirty')).toBeNull()
    expect(mocks.api).toHaveBeenCalledWith('/api/data', expect.objectContaining({ method: 'PUT' }))
    expect(mocks.api).toHaveBeenCalledWith('/api/logout', expect.anything())
  })

  it('unlinks even when the final push fails (offline is not a lock-in)', async () => {
    useStore.setState({ user: { id: 'u1', name: 'Ana' } })
    mocks.api.mockImplementation(path => {
      if (path === '/api/data') return Promise.reject(new Error('offline'))
      return Promise.resolve({ ok: true })
    })
    await useStore.getState().signOut()
    expect(useStore.getState().user).toBeNull()
  })
})
