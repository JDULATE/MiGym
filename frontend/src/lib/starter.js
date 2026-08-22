// Starter plan templates (MiGym phase 7). Starting POINTS, never a forced program:
// everything they create is an ordinary editable routine afterwards. All exercise ids
// come from the same dataset the library ships with (EXDB); starter.test.js guards that
// every id stays resolvable.
//
// `starterRoutines()` (PPL) is kept as its own export because the demo build seeds its
// history on top of exactly those three routines.
import { uid } from './format.js'

const SPEC = [
  ['Push Day', 'barbell', [['0025', 4, 8], ['0047', 3, 10], ['0426', 3, 10], ['0334', 3, 12], ['0241', 3, 12], ['0251', 3, 10]]],
  ['Pull Day', 'pullup', [['2330', 4, 10], ['0027', 4, 8], ['1323', 3, 10], ['0031', 3, 10], ['0313', 3, 12]]],
  ['Leg Day', 'legs', [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]]
]

const UPPER = ['Upper Day', 'barbell', [['0025', 4, 8], ['2330', 4, 10], ['0047', 3, 10], ['0027', 3, 8], ['0313', 3, 12], ['1323', 3, 10]]]
const LOWER = ['Lower Day', 'legs', [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0605', 4, 15]]]
const FULL = ['Full Body', 'dumbbell', [['0025', 3, 8], ['0043', 3, 8], ['2330', 3, 10], ['0027', 3, 8], ['0241', 3, 12], ['0585', 3, 12]]]

const build = list => list.map(([name, emoji, ex]) => ({
  id: uid(), name, emoji,
  ex: ex.map(([id, sets, reps]) => ({ id, sets, reps, weight: 0 })),
}))

// Fresh routine objects (new ids) — [push, pull, legs].
export const starterRoutines = () => build(SPEC)

/**
 * The template catalogue behind the "Load a starter plan" picker.
 *   key     — stable id for tests and toasts
 *   label   — i18n source string
 *   build() — fresh routines (new ids every call)
 *   week    — weekday → index into the built routines (Mon/Wed/Fri style defaults;
 *             everything stays drag-your-own-way in the weekly planner afterwards)
 */
export const STARTER_TEMPLATES = [
  { key: 'ppl', label: 'Push / Pull / Legs', build: () => ({ routines: build(SPEC), week: { 1: 0, 3: 1, 5: 2 } }) },
  { key: 'ul', label: 'Upper / Lower', build: () => ({ routines: build([UPPER, LOWER]), week: { 1: 0, 3: 1 } }) },
  { key: 'fb', label: 'Full Body', build: () => ({ routines: build([FULL]), week: { 1: 0, 4: 0 } }) },
]

/** Build one template by key; unknown keys return null so callers can fall back cleanly. */
export function buildStarterTemplate(key) {
  const t = STARTER_TEMPLATES.find(t => t.key === key)
  if (!t) return null
  const { routines, week } = t.build()
  return { routines, week, label: t.label }
}
