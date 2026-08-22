// Sync merge (ADR-0006 Stage 1) — union-first merge of two state blobs.
//
// The device base is authoritative (ADR-0005): merging never DELETES anything that
// exists only on one side. History collections are unioned by identity; configuration
// sections fall back to blob-level last-write-wins by `_ts` until per-section
// timestamps land (Stage 1b), and every mistake is reversible through server snapshots.
//
// Pure: both inputs are untouched; the result is a new object.

const byId = list => {
  const m = new Map()
  for (const item of list || []) if (item && item.id != null) m.set(item.id, item)
  return m
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
  return dates.map(d => (rm.has(d) && (newerRemote || !lm.has(d)) ? rm.get(d) : lm.get(d)))
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
 * Merge two state blobs into one. `newerRemote` decides which copy wins where a
 * whole-value conflict is possible (duplicate workout id, same-day weigh-in, config
 * sections); callers pass whether the remote blob is the newer one (`_ts` comparison).
 */
export function mergeStates(local, remote) {
  const localTs = local?._ts || 0
  const remoteTs = remote?._ts || 0
  const newerRemote = remoteTs >= localTs

  // History: unions — nothing can be lost here in either direction.
  const workouts = unionById(local?.workouts, remote?.workouts, newerRemote)
    .sort((a, b) => (a.start || 0) - (b.start || 0))
  const bodyweight = mergeBodyweight(local?.bodyweight, remote?.bodyweight, newerRemote)
  const measurements = unionMeasurements(local?.measurements, remote?.measurements)
  const customEx = unionById(local?.customEx, remote?.customEx, newerRemote)

  // Configuration sections: whole-section LWW as the Stage-1 fallback.
  const configFrom = newerRemote ? remote : local
  return {
    ...local,
    unit: configFrom.unit ?? local?.unit ?? 'kg',
    restSec: configFrom.restSec ?? local?.restSec ?? 90,
    sound: configFrom.sound ?? local?.sound ?? true,
    keepAwake: configFrom.keepAwake ?? local?.keepAwake ?? true,
    lang: configFrom.lang ?? local?.lang ?? 'en',
    theme: configFrom.theme ?? local?.theme ?? 'dark',
    accent: configFrom.accent ?? local?.accent ?? 'lime',
    body: configFrom.body ?? local?.body ?? 'male',
    targetW: configFrom.targetW !== undefined ? configFrom.targetW : (local?.targetW ?? null),
    effort: configFrom.effort !== undefined ? configFrom.effort : (local?.effort ?? null),
    reminder: configFrom.reminder ?? local?.reminder ?? { on: false },
    gifSize: configFrom.gifSize ?? local?.gifSize ?? 'full',
    routines: configFrom.routines ?? local?.routines ?? [],
    week: configFrom.week ?? local?.week ?? {},
    dayPlan: configFrom.dayPlan ?? local?.dayPlan ?? {},
    exWeights: configFrom.exWeights ?? local?.exWeights ?? {},
    profile: configFrom.profile ?? local?.profile ?? undefined,
    workouts,
    bodyweight,
    measurements,
    customEx,
    _ts: Math.max(localTs, remoteTs),
  }
}
