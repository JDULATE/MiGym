// Fitness profile (MiGym phase 2).
//
// Pure data + rules only: what a profile holds, how untrusted input is normalised,
// and how append-only measurement logs are read. Nothing here knows about React,
// the store, or the server — the same shape rides inside S everywhere (localStorage,
// sync blob, backup files), so old clients simply ignore the new keys and a missing
// profile always falls back to EMPTY_PROFILE.
//
// Deliberately NOT here: any interpretation of the data. No BMI, no calorie math,
// no health scoring — the profile exists so later phases (progression engine,
// analytics, AI coach) can consume structured facts, not to draw conclusions from
// them. No medical claims anywhere in the feature.

/** Structured training goals. Values are stable ids — never translated. */
export const GOALS = ['hypertrophy', 'strength', 'weight_loss', 'general', 'performance']

/** Display keys for goals (translated via i18n like every other label). */
export const GOAL_LABEL = {
  hypertrophy: 'Hypertrophy', strength: 'Strength', weight_loss: 'Weight loss',
  general: 'General fitness', performance: 'Performance'
}

/** Display keys for experience levels. */
export const EXPERIENCE_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

/** Self-assessed experience. A declaration, not a measurement. */
export const EXPERIENCE = ['beginner', 'intermediate', 'advanced']

/**
 * Body measurements kept as an append-only log (same spirit as S.bodyweight):
 * one record per tape reading, `{ d: 'YYYY-MM-DD', k, v }`, v in centimetres.
 * Corrections are new records — history is never rewritten.
 */
export const MEASUREMENT_KEYS = ['neck', 'shoulders', 'chest', 'waist', 'hips', 'upper_arm', 'thigh', 'calf']
export const MEASUREMENT_MAX_CM = 250

/**
 * Available equipment, using the exercise dataset's own `eq` vocabulary verbatim so
 * a future recommendation layer can match profile.equipment directly against
 * EXDB[].eq with no mapping table. This curated subset covers the overwhelming
 * majority of the library; rarer apparatus (sleds, ergometers, tires…) is omitted
 * on purpose — the list is a training-context summary, not an inventory form.
 */
export const EQUIPMENT = [
  'body weight', 'dumbbell', 'barbell', 'ez barbell', 'kettlebell',
  'cable', 'leverage machine', 'smith machine',
  'band', 'medicine ball', 'stability ball', 'weighted'
]

export const EMPTY_PROFILE = {
  name: '',            // display name override (server profiles already have account names)
  image: null,         // small JPEG data URL (client-side resized); null = no photo
  goal: null,          // GOALS | null
  experience: null,    // EXPERIENCE | null
  daysPerWeek: null,   // intended sessions per week, 1..7 | null
  sessionMinutes: null,// preferred session length, 5..300 | null
  equipment: [],       // subset of EQUIPMENT
  preferences: '',     // free text, e.g. "mornings, hates leg press" — consumed by nothing yet
  heightCm: null,      // 50..280 | null
  ageYears: null       // 10..100 | null (Giwi onboarding; optional everywhere else)
}

// Field bounds — generous, they catch typos and corrupt backups rather than police humans.
const NAME_MAX = 60
const PREFS_MAX = 500
const IMAGE_MAX_CHARS = 200000   // ~150 KB of base64; avatars are resized far below this

const clampOpt = (v, lo, hi) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null
}

/**
 * Normalise an untrusted profile blob (old backups, other devices, hand-edited JSON)
 * into a valid one. Unknown keys are dropped, bad values fall back to defaults — a
 * profile can fail validation, it just comes back empty.
 */
export function normalizeProfile(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const p = { ...EMPTY_PROFILE }
  if (typeof src.name === 'string') p.name = src.name.trim().slice(0, NAME_MAX)
  if (typeof src.preferences === 'string') p.preferences = src.preferences.trim().slice(0, PREFS_MAX)
  if (typeof src.image === 'string' && src.image.startsWith('data:image/') && src.image.length <= IMAGE_MAX_CHARS) {
    p.image = src.image
  }
  if (GOALS.includes(src.goal)) p.goal = src.goal
  if (EXPERIENCE.includes(src.experience)) p.experience = src.experience
  p.daysPerWeek = clampOpt(src.daysPerWeek, 1, 7)
  p.sessionMinutes = clampOpt(src.sessionMinutes, 5, 300)
  p.heightCm = clampOpt(src.heightCm, 50, 280)
  p.ageYears = clampOpt(src.ageYears, 10, 100)
  if (Array.isArray(src.equipment)) {
    p.equipment = [...new Set(src.equipment)].filter(eq => EQUIPMENT.includes(eq))
  }
  return p
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

/** Normalise an untrusted measurement log: valid records only, newest last, no duplicates. */
export function normalizeMeasurements(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    if (!ISO_RE.test(m.d) || !MEASUREMENT_KEYS.includes(m.k)) continue
    const v = Number(m.v)
    if (!Number.isFinite(v) || v <= 0 || v > MEASUREMENT_MAX_CM) continue
    const rec = { d: m.d, k: m.k, v }
    const id = rec.d + '|' + rec.k + '|' + rec.v
    if (seen.has(id)) continue
    seen.add(id)
    out.push(rec)
  }
  out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.k < b.k ? -1 : 1))
  return out
}

/** Most recent reading for one measurement key, or null. */
export function latestMeasurement(log, key) {
  let best = null
  for (const m of log || []) {
    if (m.k === key && (!best || m.d >= best.d)) best = m
  }
  return best
}

/** Short human-readable digest used as the profile row's subtitle in Settings. */
export function profileSummary(profile) {
  const bits = []
  if (profile.goal) bits.push(profile.goal.replaceAll('_', ' '))
  if (profile.experience) bits.push(profile.experience)
  if (profile.daysPerWeek) bits.push(profile.daysPerWeek + '/wk')
  return bits.join(' · ')
}
