// MiGym progression engine — public API.
//
// The engine is the deterministic training-mathematics layer: given a profile's logged
// history it derives prescriptions, strength estimates, effort statistics, fatigue and
// volume. Every function here is pure — same state in, same answer out, no I/O, no React,
// no writes back into history (the log is what happened; prescriptions are derived).
//
// Layout (spec §Phase 4):
//   progression/  → ./progression.js  named policies (off/linear/greyskull/double/time)
//   strength/     → ./strength.js     estimated 1RM (Epley/Brzycki/Lombardi, REP_CAP 12)
//   rir/ rpe/     → ./effort.js       one internal RIR scale, RPE display conversion
//   fatigue/      → ./fatigue.js      intensity-weighted fatigue with exponential decay
//   deload/       → ./deload.js       stall counting + back-off factors
//   volume/       → ./volume.js       warmup-aware tonnage per set/entry/workout/week
//   tests/        → ./tests/          engine-level scenarios (multi-session trajectories)
//
// Implementation note: the current bodies live in `../lib/*.js` and are re-exported here
// unchanged — views and the MCP server import those paths directly, so physical relocation
// is deferred until a phase actually needs it. This barrel defines the boundary future code
// must consume instead of deep-importing lib internals.
//
// Nothing here interprets medically, and nothing here is probabilistic. Recommendations
// always carry an explanation (`why`), and an AI layer may never override these rules.

export {
  POLICIES, POLICIES_FOR, POLICY_NAME, POLICY_DESC,
  DELOAD_AFTER, MAX_BW_SETS,
  defaultIncrement, DEFAULT_SEC_INCREMENT, policyFor,
  readSession, sessionsFor, stallCount, nextPrescription, applyPrescription,
} from '../progression.js'

export { DELOAD_FACTOR, deloadTo } from './deload.js'

export {
  REP_CAP, FORMULAS, DEFAULT_FORMULA,
  estimate1RM, bestSetOf, e1rmSeries, best1RM, is1RMRecord,
} from '../onerm.js'

export {
  HARD_RIR, MIN_RATED,
  rirOf, toScale, displayScale, scaleName, avgRir,
  effortSummary, hasEffort, effortWeeks, effortHistogram, BUCKETS, isHardSet,
} from '../effort.js'

export {
  FATIGUE_REF_VOLUME, FATIGUE_MIN_SESSIONS, FATIGUE_SCAN_MS,
  BODYWEIGHT_REF_LOAD, CARDIO_TONNAGE_PER_MIN,
  FATIGUE_HALF_LIFE_MS,
} from '../recovery.js'

export { setTonnage, entryVolume, workoutVol, workoutTonnage, weeklyVolume, volumeByExercise } from './volume.js'
