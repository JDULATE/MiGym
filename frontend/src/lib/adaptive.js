// MiGym adaptive training (phase 8) — deterministic suggestions over logged history.
//
// Layered ON the progression engine (never instead of it): the engine derives each
// exercise's next prescription; this module looks across sessions and adds what a coach
// would notice — effort landing where the plan asked, two clean sessions in a row on a
// lift without a progression policy, a movement left untouched, a week that fell short
// of the plan.
//
// Rules of the road:
//   · every suggestion carries its own explanation (why: [template, ...args])
//   · fully deterministic — same history, same suggestions; no randomness, no AI
//   · history is never modified; suggestions are read-only advice
//   · thresholds live here as named constants so they can be reasoned about and tested

import { defaultIncrement, readSession } from './engine/index.js'
import { avgRir, rirOf } from './engine/index.js'
import { EXIDX } from './exercises.js'
import { exerciseMomentum, STALLED_DAYS } from './analytics.js'
import { isWarmupRow } from './workout-model.js'

const DAY_MS = 86400000

/** Sessions back that must agree before an "increase" suggestion speaks. */
export const CONFIRM_SESSIONS = 2
/** How far mean RIR may sit above/below the target while still counting as "on target". */
export const RIR_TOLERANCE = 1
/** Recent-weeks window for the adherence check. */
export const ADHERENCE_WINDOW_DAYS = 28

// Per-session view of one exercise: engine verdict + mean logged RIR (null if unrated).
function sessionRecords(S, id, cfg) {
  const out = []
  ;(S?.workouts || []).forEach(w => {
    const e = w.entries.find(e => e.id === id)
    if (!e) return
    const rec = readSession(e, cfg)
    if (!rec.count && !rec.held?.length) return
    const rated = (e.sets || []).filter(s => s.done && rirOf(s) != null && !isWarmupRow(s))
    const meanRir = rated.length ? avgRir(rated) : null
    out.push({ d: w.d, start: w.start, ...rec, meanRir })
  })
  return out.sort((a, b) => (a.start || 0) - (b.start || 0))
}

/**
 * Adaptive suggestions for one profile.
 *
 * Returns `{ items: [...] }`, each item `{ key, exId?, name?, severity, title, why }`
 * where `title`/`why` are `[i18nTemplate, ...args]` exactly like the progression
 * engine's explanations. Kinds:
 *   increase  — earned a load bump: clean twice, effort inside the plan's RIR intent
 *               (and required when no progression policy would advance it otherwise)
 *   ease      — missing reps while grinding harder than the plan asked → step back
 *   review    — flat estimated 1RM and untouched for weeks → deload or variation
 *   adhere    — planned frequency above recent reality (gentle, once)
 */
export function adaptiveSuggestions(S) {
  const items = []
  const now = Date.now()
  const ids = [...new Set((S?.workouts || []).flatMap(w => w.entries.map(e => e.id)))]

  for (const id of ids) {
    const lastEntry = [...(S?.workouts || [])].reverse().flatMap(w => w.entries).find(e => e.id === id)
    if (!lastEntry) continue
    const cfg = { ...(lastEntry.target || {}), id }
    // Cardio and timed holds have no load ladder to climb — their policies cover them.
    if ((lastEntry.target?.mode || 'reps') !== 'reps') continue
    const name = EXIDX[id]?.n || id
    const all = sessionRecords(S, id, cfg)
    if (all.length < CONFIRM_SESSIONS) continue
    const recent = all.slice(-CONFIRM_SESSIONS)

    const allClean = recent.every(r => r.ok)
    const rated = recent.every(r => r.meanRir != null)
    const target = cfg.rirTarget
    const onTargetEffort = !rated || target == null ||
      recent.every(r => r.meanRir <= target + RIR_TOLERANCE)

    // ---- increase: two clean sessions with effort inside the plan's intent ----
    if (allClean && onTargetEffort) {
      const inc = defaultIncrement(id, S.unit || 'kg')
      const cur = recent[recent.length - 1].weight
      items.push({
        key: 'increase', exId: id, name, severity: 'good',
        title: ['Raise {0} to {1} {2}.', name, Math.round((cur + inc) * 100) / 100, S.unit || 'kg'],
        why: target != null && rated
          ? ['Every rep hit in your last two sessions, within the target RIR of {0}.', target]
          : ['Every rep hit in your last two sessions.'],
      })
    }

    // ---- ease: missing reps while grinding harder than the plan asked ----
    const last = all[all.length - 1]
    if (!last.ok && target != null && last.meanRir != null &&
        last.meanRir <= target - RIR_TOLERANCE - 1) {
      const step = defaultIncrement(id, S.unit || 'kg')
      items.push({
        key: 'ease', exId: id, name, severity: 'watch',
        title: ['Ease {0} back to {1} {2} for a session.', name, deloadStep(last.weight, step), S.unit || 'kg'],
        why: ['Reps landed short at RIR {0} — your target is {1}. Build back from {2} {3}.',
          Math.round(last.meanRir * 10) / 10, target, deloadStep(last.weight, step), S.unit || 'kg'],
      })
    }
  }

  // ---- review: flat for weeks (same thresholds as the Stats momentum card) ----
  for (const x of exerciseMomentum(S).stalled.filter(x => x.daysSince >= STALLED_DAYS).slice(0, 3)) {
    items.push({
      key: 'review', exId: x.id, name: x.name, severity: 'info',
      title: ['{0}: consider a deload week or a variation.', x.name],
      why: ['No estimated-1RM change in {0} days.', x.daysSince],
    })
  }

  // ---- adherence: planned frequency vs recent reality (once, gentle) ----
  const planned = S?.profile?.daysPerWeek
  if (planned > 0) {
    const recentCount = (S?.workouts || []).filter(w => {
      const t = w.start || new Date(w.d + 'T12:00:00').getTime()
      return Number.isFinite(t) && t > now - ADHERENCE_WINDOW_DAYS * DAY_MS
    }).length
    const actual = Math.round(recentCount / (ADHERENCE_WINDOW_DAYS / 7) * 10) / 10
    if (actual < planned * 0.6) {
      items.push({
        key: 'adhere', severity: 'info',
        title: ['You planned {0} sessions a week — the last four weeks averaged {1}.',
          planned, actual],
        why: ['Consistency drives progress more than any single session.'],
      })
    }
  }

  return { items }
}

// One deload-style step down (same arithmetic as the engine's deload).
function deloadStep(weight, step) {
  const v = weight * 0.9
  const snapped = Math.round(v / step) * step
  return snapped >= weight ? weight - step : Math.max(step, snapped)
}
