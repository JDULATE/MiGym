// Exercise taxonomy (MiGym phase 6) — derived classification + alternatives.
//
// Everything here is COMPUTED from fields the dataset already carries (bp, tg, eq, sm)
// or from the small curated override maps below. No new per-exercise content is invented:
// where a property cannot be derived honestly (e.g. compound vs isolation without joint
// analysis), this module simply does not provide it — that is documented rather than
// papered over with plausible-looking guesses.
//
// Custom exercises flow through the same functions: they carry bp and usually no eq/tg,
// so they classify as their body-part group with "other" equipment and still get
// alternatives from the same primary-muscle logic.

/** Coarse movement groups — how lifters actually browse and how alternatives are grouped. */
export const MOVEMENT_GROUPS = ['push', 'pull', 'legs', 'core', 'cardio']

const PUSH_TARGETS = ['triceps', 'deltoid', 'shoulder', 'pectoral', 'chest']
const PULL_TARGETS = ['biceps', 'lat', 'trapezius', 'upper back', 'rear delt', 'forearm']
const CORE_TARGETS = ['abdominal', 'abs', 'oblique', 'serratus']

/**
 * Coarse movement group for an exercise: cardio / core / legs / push / pull.
 * Derived from target muscle first (a bent-over row targets the back even though the
 * body part is also "back"), body part as fallback. Unmatched → null; callers must
 * cope instead of guessing.
 */
export function movementGroup(ex) {
  if (!ex) return null
  if (ex.bp === 'cardio') return 'cardio'
  const hay = [ex.tg, ex.bp].join(' ').toLowerCase()
  if (CORE_TARGETS.some(k => hay.includes(k))) return 'core'
  if (/leg|glute|hip|quad|calf|hamstring/.test(hay)) return 'legs'
  if (PUSH_TARGETS.some(k => hay.includes(k))) return 'push'
  if (PULL_TARGETS.some(k => hay.includes(k))) return 'pull'
  if (ex.bp === 'chest' || ex.bp === 'shoulders') return 'push'
  if (ex.bp === 'back') return 'pull'
  if (ex.bp === 'waist') return 'core'
  return null
}

/* ---- equipment classes → spec categories ("Machine", "Cable", "Free weight"…) ---- */

const FREE_WEIGHT_EQ = ['barbell', 'dumbbell', 'kettlebell', 'weighted', 'medicine ball']
const MACHINE_EQ = ['machine', 'smith machine', 'assisted', 'sled machine', 'leverage machine', 'skierg machine', 'stepmill machine', 'elliptical machine', 'stationary bike', 'upper body ergometer']

/** Spec category tags derivable from equipment/body part. Multiple can apply. */
export function exerciseTypeTags(ex) {
  if (!ex) return []
  const eq = String(ex.eq || '').toLowerCase()
  const tags = []
  if (ex.bp === 'cardio') tags.push('cardio')
  if (eq === 'body weight') tags.push('bodyweight')
  else if (MACHINE_EQ.some(m => eq.includes(m))) tags.push('machine')
  else if (eq === 'cable') tags.push('cable')
  else if (FREE_WEIGHT_EQ.some(f => eq.includes(f))) tags.push('free weight')
  else if (eq && eq !== 'custom') tags.push('free weight')   // bands, balls, wheels, ropes…
  return tags
}

/**
 * Learning-curve estimate from how guided the equipment is — explicitly a heuristic,
 * not a verdict: machines and cables fix your path (beginner), dumbbells/kettlebells/
 * bodyweight demand stabilisation (intermediate), free barbells add loading technique
 * (advanced). Curated overrides go in DIFFICULTY_OVERRIDES by id; the map starts empty
 * so any future hand-verified entry has an obvious home.
 */
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']
export const DIFFICULTY_OVERRIDES = {}

export function difficultyOf(ex) {
  if (!ex || ex.bp === 'cardio') return null
  if (DIFFICULTY_OVERRIDES[ex.id]) return DIFFICULTY_OVERRIDES[ex.id]
  const eq = String(ex.eq || '').toLowerCase()
  if (!eq || eq === 'custom') return null
  if (MACHINE_EQ.some(m => eq.includes(m)) || eq === 'cable' || eq.includes('band')) return 'beginner'
  if (FREE_WEIGHT_EQ.some(f => eq.includes(f)) && !eq.includes('barbell')) return 'intermediate'
  if (eq.includes('barbell') || eq === 'weighted') return 'advanced'
  return 'intermediate'
}

/**
 * Alternatives: exercises training the same primary target, preferring the same coarse
 * movement group, ranked by shared secondary muscles so a close cousin outranks a
 * coincidence of naming. Deterministic; excludes the exercise itself and anything
 * missing media-independent identity (custom exercises of other users cannot appear —
 * only EXDB entries are candidates).
 */
export function alternativesOf(ex, catalogue, limit = 5) {
  if (!ex) return []
  const group = movementGroup(ex)
  const secondaries = new Set((ex.sm || []).map(s => String(s).toLowerCase()))
  const scored = (catalogue || [])
    .filter(c => c && c.id !== ex.id)
    .map(c => {
      const g = movementGroup(c)
      let score = 0
      if (group && g === group) score += 2
      if (ex.tg && c.tg === ex.tg) score += 3
      else if (ex.bp && c.bp === ex.bp) score += 1
      const sm2 = (c.sm || []).map(s => String(s).toLowerCase())
      score += sm2.filter(s => secondaries.has(s)).length
      return { c, score }
    })
    .filter(x => x.score >= 3)          // same target, or same group + overlapping role
  scored.sort((a, b) => b.score - a.score || (a.c.n < b.c.n ? -1 : 1))
  return scored.slice(0, limit).map(x => x.c)
}
