// Volume (spec structure: volume/) — warmup-aware tonnage over logged history.
//
// Tonnage here means load × reps on completed work sets. Warm-up rows are excluded by
// default: they are preparation, and every other statistic in the app already reads the
// log that way (see workout-model.js / progression.js readSession). Timed holds and
// cardio contribute no tonnage — their stimulus is duration-based and is weighted
// elsewhere (recovery.js); pretending minutes were kilograms would corrupt both numbers.
//
// Pure functions over state S / entries only. No windowing policy lives here: callers
// (analytics, Phase 5) decide the time ranges, this module does honest arithmetic.

import { isWarmupRow } from '../workout-model.js'

/**
 * One set's tonnage. Unilateral sets need no special case: the logged rep count is the
 * total across both sides (see history.js), so both sides are already counted.
 */
export function setTonnage(set) {
  if (!set || !set.done || isWarmupRow(set)) return 0
  return (set.w || 0) * (set.r || 0)
}

/** One entry's tonnage: completed work sets only. */
export function entryVolume(entry) {
  return (entry?.sets || []).reduce((v, s) => v + setTonnage(s), 0)
}

/** One workout's tonnage across all its entries. */
export function workoutVol(w) {
  return (w?.entries || []).reduce((v, e) => v + entryVolume(e), 0)
}

/**
 * Chronological per-workout tonnage: `[{ d, start, vol }]`, oldest first. Workouts whose
 * date cannot be parsed are skipped — every consumer of this series plots it on a time
 * axis, so an undatable record would force each caller to re-validate.
 */
export function workoutTonnage(S) {
  return (S?.workouts || [])
    .filter(w => w.d && !isNaN(new Date(w.d + 'T12:00:00').getTime()))
    .map(w => ({ d: w.d, start: w.start, vol: workoutVol(w) }))
}

/** Total tonnage grouped by ISO week (`weekKey`), as `{ week, vol }` sorted oldest first. */
export function weeklyVolume(S) {
  const weeks = new Map()
  ;(S?.workouts || []).forEach(w => {
    const monday = mondayOf(w.d)
    if (!monday) return
    weeks.set(monday, (weeks.get(monday) || 0) + workoutVol(w))
  })
  return [...weeks.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([week, vol]) => ({ week, vol }))
}

/** Total tonnage for one exercise across history. */
export function volumeByExercise(S, exId) {
  return (S?.workouts || [])
    .reduce((v, w) => {
      const e = w.entries.find(e => e.id === exId)
      return e ? v + entryVolume(e) : v
    }, 0)
}

// The Monday of an ISO date as 'YYYY-MM-DD', or null for malformed input. Weeks bucket by
// Monday so a week is the same seven days everywhere it is displayed.
function mondayOf(iso) {
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}
