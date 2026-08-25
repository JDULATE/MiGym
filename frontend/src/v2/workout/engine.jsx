// Workout engine (UI-V2) — every mutation and flow from views/Workout.jsx ActiveWorkout,
// extracted so the new skin and the legacy view share one source of truth for behavior.
// Zero JSX here. Flows that open sheets/toasts call them exactly like V1 did.
import { useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { exOr } from '../../lib/exercises.js'
import {
  effectiveRoutine, buildSets, freestyleConfig, defaultConfig,
  setsDoneActive, supersetUnits, unitOf, modeOf, isBw, EFFORT, effortOf,
  cascadeWeight, insertWarmupRow, removeRowAt, pairAdjacent, unpairSuperset, cleanupSg, repStep,
} from '../../lib/history.js'
import { setProgressHighWater, supersetFlowStep } from '../../lib/supersetFlow.js'
import { todayISO } from '../../lib/format.js'
import { beep, vibrate } from '../../lib/sound.js'
import { api } from '../../lib/api.js'
import { topWeightSheet, workoutCompleteSheet, confirmSheet } from '../../sheets.jsx'
import { nextPrescription, applyPrescription } from '../../lib/progression.js'

export { removeActiveExercise } from '../../views/Workout.jsx'

/* start-chooser data (no active session yet) */
export function useStartChooser() {
  const S = useStore(s => s.S)
  const todayR = effectiveRoutine(S, todayISO())
  return {
    S, todayR,
    todayOvr: S.dayPlan[todayISO()] !== undefined,
    others: S.routines.filter(r => r !== todayR),
  }
}

export function useWorkoutEngine() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const { startRest, stopRest, work } = useUI()
  const A = S.active
  const units = supersetUnits(A.entries)
  const cur = Math.min(A.cur, Math.max(0, A.entries.length - 1))
  const unit = A.entries.length ? unitOf(units, cur) : []
  const unitIdx = units.findIndex(u => u === unit)
  const isSuperset = unit.length > 1
  const progressHighWater = useRef(A.entries.map(e => e.sets.filter(s => s.done).length))

  useEffect(() => {
    progressHighWater.current = A.entries.map(e => e.sets.filter(s => s.done).length)
  }, [A.entries.length])

  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const done = setsDoneActive(A)
  const restFor = idx => A.entries[idx]?.target?.rest > 0 ? A.entries[idx].target.rest : S.restSec

  const mutEntry = (idx, fn) => update(s => { fn(s.active.entries[idx]) }, true)
  const setField = (idx, i, field, v) => mutEntry(idx, e => {
    if (v == null) delete e.sets[i][field]; else e.sets[i][field] = v
    if (field === 'w') e.sets = cascadeWeight(e.sets, i, v)
  })
  const modeAt = idx => modeOf({ ...(A.entries[idx].target || {}), id: A.entries[idx].id })
  const addSet = idx => mutEntry(idx, e => {
    const l = e.sets[e.sets.length - 1]
    const m = modeOf({ ...(e.target || {}), id: e.id })
    if (m === 'cardio') e.sets.push({ min: l ? l.min : (e.target.min || 20), speed: l ? l.speed : (e.target.speed || 8), done: false })
    else if (m === 'time') e.sets.push({ sec: l ? l.sec : (e.target.sec || 45), w: l ? (l.w || 0) : (e.target.weight || 0), done: false })
    else e.sets.push({ w: l ? l.w : 0, r: l ? l.r : e.target.reps, done: false })
  })
  const removeSet = idx => mutEntry(idx, e => { if (e.sets.length > 1) e.sets.pop() })
  const addWarmup = idx => mutEntry(idx, e => {
    const m = modeOf({ ...(e.target || {}), id: e.id })
    e.sets = insertWarmupRow(e.sets, m, e.target || {})
  })
  const removeSetAt = (idx, i) => mutEntry(idx, e => { e.sets = removeRowAt(e.sets, i) })
  const pairAt = (first, second) => update(s => { s.active.entries = pairAdjacent(s.active.entries, first, second) })
  const unpairAt = idx => update(s => { s.active.entries = unpairSuperset(s.active.entries, idx) })
  const onPairPrev = !isSuperset && cur > 0 ? () => pairAt(cur - 1, cur) : null
  const onPairNext = !isSuperset && cur < A.entries.length - 1 ? () => pairAt(cur, cur + 1) : null

  const confirmRemoveExercise = idx => {
    const e = A.entries[idx]
    if (!e) return
    const hasDone = (e.sets || []).some(s => s.done)
    confirmSheet({
      title: t('Remove {0}?', exOr(e.id).n),
      message: hasDone
        ? t('The sets you logged for this exercise in this session will be lost.')
        : t('This removes the exercise from your current session.'),
      confirmText: t('Remove'), danger: true,
      onConfirm: () => useUI.getState().stopWork() || useStore.getState().update(s => {
        if (!s.active || !Array.isArray(s.active.entries)) return
        if (idx < 0 || idx >= s.active.entries.length) return
        s.active.entries.splice(idx, 1)
        cleanupSg(s.active.entries)
        if (idx < s.active.cur) s.active.cur--
        if (s.active.cur >= s.active.entries.length) s.active.cur = Math.max(0, s.active.entries.length - 1)
      }, true),
    })
  }
  const removeExerciseSheet = () => {
    if (unit.length > 1) {
      useUI.getState().openSheet(close => (
        <div>
          <h3>{t('Remove exercise')}</h3>
          <div className="muted small" style={{ marginBottom: 12 }}>{t('Which exercise in this superset do you want to remove?')}</div>
          <div className="list">
            {unit.map(idx => <div key={idx} className="item" onClick={() => { close(); confirmRemoveExercise(idx) }}>
              <div className="grow"><div className="tt">{exOr(A.entries[idx]?.id).n}</div></div>
            </div>)}
          </div>
        </div>
      ))
    } else confirmRemoveExercise(cur)
  }

  const startTimed = (idx, i) => {
    const e = A.entries[idx]
    useUI.getState().startWork(e.sets[i].sec || 45, exOr(e.id).n, elapsed => {
      mutEntry(idx, en => { en.sets[i].sec = elapsed })
      if (!useStore.getState().S.active.entries[idx].sets[i].done) toggle(idx, i)
    })
  }

  let pendingNav = null
  const toggle = (idx, i) => {
    const m = modeAt(idx)
    const cardioEntry = m === 'cardio'
    const isLastUnit = unitIdx >= units.length - 1
    let askTop = false, exJustDone = false, workoutDone = false, checked = false
    mutEntry(idx, e => {
      e.sets[i].done = !e.sets[i].done
      checked = e.sets[i].done
      if (e.sets[i].done) {
        beep(S.sound, 1040, 0.12); vibrate(30)
        const unitDone = unit.every(ui => (ui === idx ? e : A.entries[ui]).sets.every(x => x.done))
        if (unitDone && isLastUnit) workoutDone = true
        const loaded = m === 'reps' && !(isBw({ ...(e.target || {}), id: e.id }) && !e.sets.some(x => x.w > 0))
        if (e.sets.every(x => x.done)) { exJustDone = true; if (loaded && !e.asked) { e.asked = true; askTop = true } }
      }
    })
    if (askTop) topWeightSheet(idx)
    else if (workoutDone) workoutCompleteSheet()
    else if (exJustDone && cardioEntry) useUI.getState().toast(t('Cardio logged'))
    else if (exJustDone && m === 'time') useUI.getState().toast(t('Hold logged'))

    const fresh = useStore.getState().S.active
    if (fresh && checked && fresh.entries[idx]) {
      const progress = setProgressHighWater(fresh.entries[idx], progressHighWater.current[idx] || 0)
      progressHighWater.current[idx] = progress.highWater
      if (!progress.isNew) return
      const freshUnits = supersetUnits(fresh.entries)
      const freshUnit = freshUnits.find(u => u.includes(idx))
      const freshUnitIdx = freshUnits.indexOf(freshUnit)
      const freshLastUnit = freshUnitIdx >= freshUnits.length - 1
      const freshUnitDone = freshUnit?.every(ui => fresh.entries[ui].sets.every(x => x.done))
      if (freshUnitDone) stopRest()
      if (!freshUnit || freshUnit.length <= 1) {
        if (!freshUnitDone) startRest(restFor(idx))
        return
      }
      const step = supersetFlowStep(fresh.entries, freshUnit, idx)
      if (!step) return
      if (step.unitDone) {
        if (!freshLastUnit) {
          const nextUnit = freshUnits[freshUnitIdx + 1]
          // The top-weight sheet's explicit "Just close" path owns the choice not to advance.
          if (!askTop && nextUnit?.length) update(s => { if (s.active) s.active.cur = nextUnit[0] })
          startRest(restFor(idx))
        }
      } else {
        if (step.nextIdx != null) update(s => { if (s.active) s.active.cur = step.nextIdx })
        if (step.roundDone) startRest(restFor(idx))
      }
    }
  }

  /* live-presence heartbeat (admin "training now") */
  useEffect(() => {
    if (!useStore.getState().user) return
    let stopped = false
    const ping = on => {
      const A2 = useStore.getState().S.active
      if (!A2) return
      const u = supersetUnits(A2.entries)
      const c = Math.min(A2.cur, Math.max(0, A2.entries.length - 1))
      const ui = u.findIndex(x => x.includes(c))
      api('/api/activity', { method: 'POST', body: JSON.stringify({
        active: on, name: A2.name, exIdx: ui + 1, exTotal: u.length,
        setsDone: setsDoneActive(A2), setsTotal: A2.entries.reduce((n, e) => n + e.sets.length, 0), startedAt: A2.start,
      }) }).catch(() => {})
    }
    ping(true)
    const iv = setInterval(() => { if (!stopped) ping(true) }, 20000)
    return () => {
      stopped = true; clearInterval(iv)
      // best-effort "left" signal: sendBeacon survives tab close, fetch covers in-app nav
      try { navigator.sendBeacon?.('/api/activity', new Blob([JSON.stringify({ active: false })], { type: 'application/json' })) } catch { /* best effort */ }
      api('/api/activity', { method: 'POST', body: JSON.stringify({ active: false }) }).catch(() => {})
    }
  }, [])

  const addExercise = ex => {
    const routine = S.routines.find(r => r.id === A.routineId)
    const freestyle = !A.routineId
    const seed = freestyle ? freestyleConfig(S, { id: ex.id, ...defaultConfig(ex.id) }) : null
    useUI.getState().closeSheet?.()
    import('../../sheets.jsx').then(({ exConfigSheet }) => exConfigSheet(ex, null, cfg => update(s => {
      const full = { ...cfg, id: ex.id }
      const plan = freestyle ? null : nextPrescription(s, full, s.routines.find(r => r.id === s.active.routineId))
      const sets = buildSets(s, full, freestyle ? { preferLast: true } : undefined)
      s.active.entries.push({ id: ex.id, target: { ...cfg }, plan, sets: freestyle ? sets : applyPrescription(sets, plan) })
      s.active.cur = s.active.entries.length - 1
    }), null, routine, seed))
  }

  return {
    S, A, update, work, startRest, stopRest,
    units, cur, unit, unitIdx, isSuperset, total, done, restFor,
    setField, addSet, removeSet, addWarmup, removeSetAt, unpairAt, onPairPrev, onPairNext,
    removeExerciseSheet, startTimed, toggle, addExercise,
    goUnit: i => update(s => { s.active.cur = units[i][0] }),
    discard: () => confirmSheet({
      title: t('Discard workout?'),
      message: t('The sets you logged in this session will be lost.'),
      confirmText: t('Discard'), danger: true,
      onConfirm: () => { update(s => { s.active = null }); stopRest(); },
    }),
  }
}

/* column configuration shared by any skin (verbatim semantics from V1) */
export function columnsFor(S, entry) {
  const cfg = { ...(entry.target || {}), id: entry.id }
  const mode = modeOf(cfg)
  const cardio = mode === 'cardio'
  const timed = mode === 'time'
  const bw = !cardio && isBw(cfg)
  const added = bw && entry.sets.some(s => s.w > 0)
  const loadCol = { f: 'w', step: 2.5, dec: true, hd: bw ? t('Added ({0})', S.unit) : t('Weight ({0})', S.unit) }
  const repCol = { f: 'r', step: repStep(cfg), dec: false, hd: t('Reps') }
  const col1 = cardio ? { f: 'min', step: 1, dec: false, hd: t('Duration (min)') }
    : timed ? { f: 'sec', step: 5, dec: false, hd: t('Seconds') }
      : (bw && !added) ? repCol : loadCol
  const col2 = cardio ? { f: 'speed', step: 0.5, dec: true, hd: t('Speed (km/h)') }
    : timed ? ((bw && !added) ? null : loadCol)
      : (bw && !added) ? null : repCol
  const kind = effortOf(S)
  const eff = EFFORT[kind]
  const col3 = mode === 'reps' && eff ? { ...eff, eff: kind, dec: true, opt: true, hd: t(eff.hd) } : null
  return { mode, cardio, timed, bw, added, col1, col2, col3 }
}
