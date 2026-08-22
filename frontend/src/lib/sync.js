// Sync merge (ADR-0006 stages 1 + 1b + 2) — union-first merge of two state blobs.
//
// The device base is authoritative (ADR-0005): merging never DELETES anything that
// exists only on one side — except through an explicit tombstone (stage 2): a workout
// removed by a backup import or reset stays removed everywhere, once every device has
// seen the tombstone. History collections are unioned by identity; configuration
// sections follow per-section timestamps (`S._mts`, stage 1b) with blob-level `_ts`
// as fallback, and server snapshots remain the recovery path of last resort.
//
// Pure: both inputs are untouched; the result is a new object.

/** Config sections carried in S._mts (stage 1b). */
export const MT_SECTIONS = ['routines', 'week', 'dayPlan', 'exWeights', 'profile', 'settings']

/** Tombstones older than this stop suppressing copies — a re-created lift must live. */
export const TOMBSTONE_TTL_MS = 180 * 86400000

const SETTINGS_KEYS = ['unit', 'restSec', 'sound', 'keepAwake', 'lang', 'theme', 'accent',
  'body', 'targetW', 'effort', 'reminder', 'gifSize']

const byId = list => {
  const m = new Map()
  for (const item of list || []) if (item && item.id != null) m.set(item.id, item)
  return m
}

/**
 * Which side's copy of a section wins: per-section timestamps when both sides know
 * them (stage 1b), blob-level `_ts` otherwise (pre-1b clients), missing-section
 * fallback to local, and a final tie to `newerRemote`.
 */
function sectionWinner(local, remote, key, newerRemote) {
  const lm = local?._mts?.[key]
  const rm = remote?._mts?.[key]
  if (lm != null && rm != null) return rm > lm ? remote : local
  if (rm != null) return remote
  if (lm != null) return local
  return newerRemote ? remote : local
}

function pickSection(local, remote, key, newerRemote) {
  const src = sectionWinner(local, remote, key, newerRemote)
  return src?.[key] !== undefined ? src[key] : src === remote ? undefined : undefined
}

/** Union of two lists keyed by `id`. On duplicate ids the NEWER side's copy wins whole. */
function unionById(localList, remoteList, newerRemote) {
  const lm = byId(localList)
  const rm = byId(remoteList)
  const out = []
  for (const [id, item] of lm) out.push(rm.has(id) && newerRemote ? rm.get(id) : item)
  for (const [id, item] of rm) if (!lm.has(id)) out.push(item)
  return out
}

/** Bodyweight log merged by date. Same date on both sides → newer blob's reading wins. */
function mergeBodyweight(local, remote, newerRemote) {
  const lm = new Map((local || []).map(b => [b.d, b]))
  const rm = new Map((remote || []).map(b => [b.d, b]))
  const dates = [...new Set([...lm.keys(), ...rm.keys()])]
    .filter(Boolean)
    .sort((a, b) => (a < b ? -1 : 1))
  return dates.map(d => ((rm.has(d) && (newerRemote || !lm.has(d)))) ? rm.get(d) : lm.get(d))
    .filter(b => b && b.w != null)
}

/** Measurements are append-only records {d,k,v}: a pure set-union, newest last. */
function unionMeasurements(a, b) {
  const seen = new Set()
  const out = []
  for (const rec of [...(a || []), ...(b || [])]) {
    if (!rec || typeof rec !== 'object') continue
    const key = `${rec.d}|${rec.k}|${rec.v}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rec)
  }
  return out.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : String(x.k).localeCompare(String(y.k))))
}

/**
 * Stage 2: honour deletion tombstones for workouts. A tombstone suppresses any copy of
 * the workout whose session time predates it — so a lift deleted on one device stays
 * deleted after sync, while the same exercise logged again LATER survives and grows.
 */
function applyWorkoutTombstones(workouts, tombsA, tombsB) {
  const tombs = {}
  for (const t of [tombsA?.workouts, tombsB?.workouts]) {
    for (const [id, ts] of Object.entries(t || {})) {
      tombs[id] = Math.max(tombs[id] || 0, Number(ts) || 0)
    }
  }
  const now = Date.now()
  return workouts.filter(w => {
    const t = tombs[w.id]
    if (t == null) return true
    if (now - t > TOMBSTONE_TTL_MS) return true            // expired: re-created lifts live
    const at = w.end || w.start || 0
    return at > t                                           // logged AFTER the deletion
  })
}

/**
 * Record stage-2 tombstones for workouts present in `prev` but missing from `next`
 * (backup import, reset). Returns the map to store in `S._tomb.workouts`.
 */
export function computeWorkoutTombstones(prev, next, ts = Date.now()) {
  const nextIds = new Set((next?.workouts || []).map(w => w.id))
  const out = { ...((prev?._tomb?.workouts) || {}) }
  for (const w of prev?.workouts || []) {
    if (!nextIds.has(w.id)) out[w.id] = Math.max(out[w.id] || 0, ts)
  }
  // prune expired entries so the map cannot grow forever
  const cutoff = ts - TOMBSTONE_TTL_MS
  for (const id of Object.keys(out)) if (out[id] < cutoff) delete out[id]
  return out
}

/**
 * Merge two state blobs into one. `newerRemote` decides which copy wins where a
 * whole-value conflict is possible without timestamps; `_mts` refines it per section;
 * `_tomb` lets deletions propagate.
 */
export function mergeStates(local, remote) {
  const localTs = local?._ts || 0
  const remoteTs = remote?._ts || 0
  const newerRemote = remoteTs >= localTs

  // History: unions — nothing can be lost here in either direction (except via tombstones).
  const workouts = applyWorkoutTombstones(
    unionById(local?.workouts, remote?.workouts, newerRemote)
      .sort((a, b) => (a.start || 0) - (b.start || 0)),
    local?._tomb, remote?._tomb,
  )
  const bodyweight = mergeBodyweight(local?.bodyweight, remote?.bodyweight, newerRemote)
  const measurements = unionMeasurements(local?.measurements, remote?.measurements)
  const customEx = unionById(local?.customEx, remote?.customEx, newerRemote)

  // Configuration sections: per-section winner (stage 1b). A section absent from the
  // winning side falls back to the other side rather than wiping it.
  const pick = key => {
    const src = sectionWinner(local, remote, key, newerRemote)
    if (src?.[key] !== undefined) return src[key]
    const other = src === remote ? local : remote
    return other?.[key]
  }

  // Scalars travel as one virtual "settings" section.
  const settingsSrc = sectionWinner(local, remote, 'settings', newerRemote)
  const scalars = {}
  for (const k of SETTINGS_KEYS) {
    const fromWinner = settingsSrc?.[k]
    const fromOther = (settingsSrc === remote ? local : remote)?.[k]
    scalars[k] = fromWinner !== undefined ? fromWinner
      : fromOther !== undefined ? fromOther
      : (newerRemote ? remote : local)?.[k]
  }

  // Tombstones union with max-ts semantics so a deletion seen anywhere propagates.
  const _tomb = {}
  for (const t of [local?._tomb, remote?._tomb]) {
    for (const k of Object.keys(t || {})) {
      _tomb[k] = { ...(_tomb[k] || {}), ...(t[k] || {}) }
      for (const id of Object.keys(_tomb[k])) {
        _tomb[k][id] = Math.max(Number(_tomb[k][id]) || 0, Number(t[k][id]) || 0)
      }
    }
  }

  return {
    ...local,
    ...scalars,
    routines: pick('routines') ?? [],
    week: pick('week') ?? {},
    dayPlan: pick('dayPlan') ?? {},
    exWeights: pick('exWeights') ?? {},
    profile: pick('profile'),
    workouts,
    bodyweight,
    measurements,
    customEx,
    _mts: (() => {
      const out = { ...(local?._mts || {}), ...(remote?._mts || {}) }
      for (const k of Object.keys(out)) if (!(Number(out[k]) > 0)) delete out[k]
      return out
    })(),
    _tomb,
    _ts: Math.max(localTs, remoteTs),
  }
}
