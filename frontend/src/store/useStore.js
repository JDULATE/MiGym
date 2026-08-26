import { create } from 'zustand'
import { api } from '../lib/api.js'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'
import { EMPTY_PROFILE } from '../lib/profile.js'
import { mergeStates, MT_SECTIONS, computeWorkoutTombstones } from '../lib/sync.js'
import { DEMO, DEMO_SEEDED } from '../lib/demo.js'
import { MOBILE, nativeLoad, nativeSave, syncReminder } from '../lib/mobile.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, sound: true, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'giwi', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  // effort: which per-set effort scale is logged — 'none' | 'rir' | 'rpe'. null, not 'none', so
  // that a profile which never chose (loaded state is overlaid on DEF, on every path: local,
  // server pull, backup import) still falls back to the `showRir` boolean this replaced and
  // keeps the column it had. See effortOf.
  reminder: { on: false, time: '08:00', tz: null }, effort: null,
  // MiGym phase 2 — fitness profile (structured facts for later phases to consume; see
  // lib/profile.js) and the append-only body-measurement log. Both ride the normal sync/backup
  // paths; a state saved without them overlays onto these defaults unchanged.
  profile: { ...EMPTY_PROFILE }, measurements: []
}
const clone = o => JSON.parse(JSON.stringify(o))

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return Object.assign(clone(DEF), JSON.parse(raw))
  } catch (e) { /* ignore */ }
  return clone(DEF)
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

export const useStore = create((set, get) => {
  let pushTm = null
  let saveTm = null

  // Mobile build: mirror the state into a file in the app's data directory (survives WebView
  // storage eviction) and keep the native reminder schedule in step with the weekly plan.
  const nativePersist = () => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; nativeSave(get().S); syncReminder(get().S) }, 800)
  }

  // Stage-1b section stamps: whichever config sections actually changed get a fresh
  // timestamp, so the sync merge can resolve conflicts per section. Sections compare
  // by JSON (update() clones S, so references always differ). Workouts are excluded —
  // they merge by id and deletions carry tombstones instead.
  const stampSections = (next, prev) => {
    const mts = { ...(prev?._mts || {}), ...(next._mts || {}) }
    const now = Date.now()
    for (const key of MT_SECTIONS) {
      const a = key === 'settings'
        ? JSON.stringify(Object.fromEntries(Object.entries(next).filter(([k]) => !k.startsWith('_') && !['routines', 'week', 'dayPlan', 'exWeights', 'profile', 'workouts', 'bodyweight', 'measurements', 'customEx', 'active'].includes(k))))
        : JSON.stringify(next[key] ?? null)
      const b = key === 'settings'
        ? JSON.stringify(Object.fromEntries(Object.entries(prev || {}).filter(([k]) => !k.startsWith('_') && !['routines', 'week', 'dayPlan', 'exWeights', 'profile', 'workouts', 'bodyweight', 'measurements', 'customEx', 'active'].includes(k))))
        : JSON.stringify(prev?.[key] ?? null)
      if (a !== b) mts[key] = now
    }
    next._mts = mts
  }

  const persist = (S, push = true) => {
    stampSections(S, get().S)
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    set({ S })
    if (MOBILE) nativePersist()
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 1500)
    }
  }

  // A setting changed right before switching away/closing the tab must not get lost mid-debounce
  // (e.g. setting the reminder time then immediately backgrounding to test it). On mobile the
  // same applies to the file mirror — backgrounding is often the last thing before the OS
  // kills the app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (MOBILE && saveTm) {
      clearTimeout(saveTm)
      saveTm = null
      nativeSave(get().S)
    }
    if (pushTm) {
      clearTimeout(pushTm)
      pushTm = null
      get().pushState()
    }
  })

  // Unlinking (or ending sessions remotely) keeps the local base intact — the device's
  // data is THE data; the server was only a sync/backup target. Only the link and the
  // dirty marker go away.
  const clearLink = () => {
    get().setUser(null)
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem('gym_guest')   // legacy flag from the guest-mode era
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    // `user` is an OPTIONAL linked server profile (sync/backup target). The app is fully
    // functional without it — local-first is the only mode.
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      persist(S, push)
    },
    replaceState(S, push = false) {
      // Stage 2: a wholesale replacement (backup import, reset) that removes workouts
      // records deletion tombstones, so the removal propagates instead of being undone
      // by the next merge.
      S._tomb = { ...(S._tomb || {}), workouts: computeWorkoutTombstones(get().S, S) }
      persist(clone(S), push)
    },

    setUser(u) {
      if (u) { localStorage.setItem('gym_user', JSON.stringify(u)) }
      else localStorage.removeItem('gym_user')
      set({ user: u })
    },

    async pushState() {
      if (!get().user) return
      clearTimeout(pushTm)
      try { await api('/api/data', { method: 'PUT', body: JSON.stringify({ state: get().S }) }); localStorage.removeItem('gym_dirty') }
      catch (e) { localStorage.setItem('gym_dirty', '1') }
    },
    async pullState() {
      try {
        const { state } = await api('/api/data')
        const S = get().S
        if (state && hasData(S)) {
          // ADR-0006 stage 1: union-first merge — history from both sides survives,
          // config sections follow the newer blob, the running workout stays device-local.
          const merged = Object.assign(clone(DEF), mergeStates(S, state))
          const active = S.active
          if (active) merged.active = active
          persist(merged, false)
          await get().pushState()   // publish the union so both ends converge
        } else if (state && !hasData(S)) {
          persist(Object.assign(clone(DEF), state), false)
        }
      } catch (e) { /* offline — keep local */ }
    },

    // Unlink this device from its server profile. The local base is THE data and stays
    // exactly as it is — only the link (and the sync marker) goes away. A final push runs
    // first so the server copy isn't left behind.
    async signOut() {
      try { await get().pushState(); await api('/api/logout', { method: 'POST', body: '{}' }) } catch (e) { /* offline — link cleared anyway */ }
      clearLink()
    },

    // "End all sessions": the server bumps this profile's session version, which kills every
    // session it has on any device — this one included, so the app has to end up unlinked
    // here too. Unlike unlink() the request is NOT swallowed: if it fails, sessions elsewhere
    // are still valid and saying otherwise would be a lie. Local data always stays.
    async signOutAll() {
      await get().pushState()   // never throws — stores gym_dirty and moves on when offline
      await api('/api/logout/all', { method: 'POST', body: '{}' })
      clearLink()
    },

    // Demo build only: drop the seeded example profile back in (Settings → "Reset demo data").
    // Dynamic import so the generator never ships in a self-hosted bundle.
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      localStorage.removeItem('gym_dirty')
      persist(Object.assign(clone(DEF), buildDemoState()), false)
    },

    // Boot: local data first, always. A linked server profile (if any) is restored in the
    // background for sync/backup — an unreachable or signed-out server never blocks entry.
    async boot() {
      // Legacy accent migration: pre-rebrand installs stored warm accents; the
      // factory look is Giwi blue. One-time, choice-preserving for the new palette.
      const cur = get().S
      if (cur.accent === 'ember' || cur.accent === 'orange') cur.accent = 'giwi'

      // Mobile build: no backend either — restore from the file mirror (the durable copy;
      // localStorage may have been evicted since the last run) and go straight in.
      if (MOBILE) {
        const saved = await nativeLoad()
        const S = get().S
        if (saved && (!hasData(S) || (saved._ts || 0) >= (S._ts || 0))) {
          persist(Object.assign(clone(DEF), saved), false)
        } else if (hasData(S)) {
          nativeSave(S)   // first run after an update from a file-less version: seed the mirror
        }
        syncReminder(get().S)
        set({ ready: true })
        return
      }
      // Demo build (GitHub Pages): no backend at all — seed once, straight in.
      if (DEMO) {
        if (!localStorage.getItem(DEMO_SEEDED)) {
          localStorage.setItem(DEMO_SEEDED, '1')
          await get().resetDemo()
        }
        set({ ready: true })
        return
      }
      // Local-first: the app is usable immediately. If a previously linked profile still has a
      // valid session, restore the link and pull its copy; any failure just means "stay local".
      try {
        const me = await api('/api/me')
        get().setUser(me.user)
        await get().pullState()
        // Re-stamp the reminder's timezone on every load — keeps it correct if you're travelling,
        // without needing to revisit Settings.
        const tz = localTZ()
        if (get().S.reminder?.on && get().S.reminder.tz !== tz) {
          get().update(s => { s.reminder = { ...s.reminder, tz } })
        }
      } catch (e) {
        if (e.status === 401) get().setUser(null)
      }
      set({ ready: true })
    }
  }
})

export { hasData }
