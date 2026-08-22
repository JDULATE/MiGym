// MiGym analytics (phase 5) — the layer that answers five questions in one look:
//
//   1. Am I progressing?        → exerciseMomentum(): what improved, what stalled
//   2. What exercises improved? → exerciseMomentum().improving
//   3. What muscles am I…       → answered by the muscle map (inherited); not duplicated here
//   4. How consistent am I?     → trainingSummary(): sessions/week, duration, volume trend
//   5. Where am I stagnating?   → exerciseMomentum().stalled
//
// Pure functions over state S, built on the progression-engine boundary (engine/volume,
// engine/onerm). Every number is derived from recorded facts; nothing here predicts,
// prescribes, or interprets medically — classification thresholds are explicit constants.

import { e1rmSeries } from './onerm.js'
import { weeklyVolume, workoutVol } from './engine/volume.js'
import { EXIDX } from './exercises.js'

/** How big a change counts as real rather than noise on an estimated 1RM. */
export const MOMENTUM_BAND = 0.02        // ±2 % — below this an estimate has not moved
/** A movement counts as stalled when it is flat AND has been left alone this long. */
export const STALLED_DAYS = 21
/** Minimum logged sessions before momentum says anything at all. */
export const MIN_SESSIONS_FOR_MOMENTUM = 4
/** Recent = the average of this many most-recent estimates. */
export const RECENT_SESSIONS = 2

const DAY_MS = 86400000

/**
 * Consistency & workload digest over a trailing window.
 *
 * @returns {
 *   sessions,            // workouts fully or partly logged in the window
 *   perWeek,             // sessions / weeks elapsed (1 decimal)
 *   avgDurationMin,      // mean of end-start across timed sessions, rounded | null
 *   weekVolume,          // tonnage in the trailing 7 days (work sets only)
 *   avgWeekVolume,       // mean weekly tonnage across full weeks in the window | null
 *   monthVolume,         // tonnage in the current calendar month
 *   prs30                // personal records detected in the trailing 30 days
 * }
 */
export function trainingSummary(S, days = 56) {
  const now = Date.now()
  const inWindow = (S?.workouts || []).filter(w => {
    const t = w.start || new Date(w.d + 'T12:00:00').getTime()
    return Number.isFinite(t) && t > now - days * DAY_MS
  })
  const durations = inWindow.map(w => (w.end || 0) - (w.start || 0)).filter(ms => ms > 60 * 1000)
  const volSeries = weeklyVolume(S).slice(-Math.ceil(days / 7))
  const monthKey = new Date().toISOString().slice(0, 7)
  const monthVolume = (S?.workouts || [])
    .filter(w => String(w.d || '').slice(0, 7) === monthKey)
    .reduce((v, w) => v + workoutVol(w), 0)
  const weekVolume = inWindow
    .filter(w => (w.start || 0) > now - 7 * DAY_MS || new Date(w.d + 'T12:00:00').getTime() > now - 7 * DAY_MS)
    .reduce((v, w) => v + workoutVol(w), 0)
  const prs30 = (S?.workouts || [])
    .filter(w => (w.start || 0) > now - 30 * DAY_MS)
    .reduce((n, w) => n + ((w.prs || []).length ? 1 : 0), 0)
  return {
    sessions: inWindow.length,
    perWeek: inWindow.length ? Math.round(inWindow.length / (days / 7) * 10) / 10 : 0,
    avgDurationMin: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
      : null,
    weekVolume,
    avgWeekVolume: volSeries.length
      ? Math.round(volSeries.reduce((a, b) => a + b.vol, 0) / volSeries.length)
      : null,
    monthVolume,
    prs30,
  }
}

/**
 * Which movements are moving and which are stuck.
 *
 * Per reps-mode exercise with at least MIN_SESSIONS_FOR_MOMENTUM estimated-1RM points:
 *   recent   = mean of the last RECENT_SESSIONS estimates
 *   baseline = best estimate before those sessions
 *   improving: recent exceeds baseline by more than MOMENTUM_BAND
 *   stalled:   recent is at/below baseline beyond the noise band, or flat with no
 *              session in the last STALLED_DAYS
 *   stable:    everything else
 *
 * Returns `{ improving: [], stalled: [], stable: [] }`, each entry
 * `{ id, name, recentEst, baselineEst, deltaPct, daysSince }` — lists sorted so the
 * biggest mover / longest-stuck comes first.
 */
export function exerciseMomentum(S) {
  const ids = [...new Set((S?.workouts || []).flatMap(w => w.entries.map(e => e.id)))]
  const out = { improving: [], stalled: [], stable: [] }
  const now = Date.now()
  for (const id of ids) {
    const pts = e1rmSeries(S, id)
    if (pts.length < MIN_SESSIONS_FOR_MOMENTUM) continue
    const recentPts = pts.slice(-RECENT_SESSIONS)
    const recent = recentPts.reduce((a, p) => a + p.y, 0) / recentPts.length
    const earlier = pts.slice(0, -RECENT_SESSIONS)
    const baseline = Math.max(...earlier.map(p => p.y))
    const lastT = pts[pts.length - 1].t || new Date(pts[pts.length - 1].d + 'T12:00:00').getTime()
    const daysSince = Math.floor((now - lastT) / DAY_MS)
    const name = EXIDX[id]?.n || id
    const rec = {
      id, name,
      recentEst: Math.round(recent * 10) / 10,
      baselineEst: Math.round(baseline * 10) / 10,
      deltaPct: Math.round(((recent - baseline) / baseline) * 1000) / 10,
      daysSince,
    }
    if (rec.deltaPct > MOMENTUM_BAND * 100) out.improving.push(rec)
    else if (rec.deltaPct < -MOMENTUM_BAND * 100 || (daysSince >= STALLED_DAYS && Math.abs(rec.deltaPct) <= MOMENTUM_BAND * 100)) out.stalled.push(rec)
    else out.stable.push(rec)
  }
  out.improving.sort((a, b) => b.deltaPct - a.deltaPct)
  out.stalled.sort((a, b) => b.daysSince - a.daysSince)
  out.stable.sort((a, b) => b.deltaPct - a.deltaPct)
  return out
}
