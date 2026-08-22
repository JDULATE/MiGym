# Data Model

Status: Phase 0 audit. Describes the data **as it exists today** in the inherited openGym
codebase (frontend `src/store/useStore.js`, `src/lib/history.js`, api `server.js`).
MiGym extends this incrementally; every extension gets documented here.

## Storage locations

| Store | File | Contents |
|---|---|---|
| Browser | `localStorage["gym_state_v1"]` | the user's entire state object `S` |
| Mobile mirror | app-private `opengym-state.json` | same `S`; durable copy restored on launch |
| Server (self-hosted) | `./data/state-<uid>.json` | same `S` minus `active` (workout-in-progress is device-local) |
| Server registry | `./data/db.json` | `{ users[], creds[], subs[], invites[] }` |
| Server secrets | `./data/secret`, `./data/vapid.json` | session HMAC key; auto-generated VAPID keys |

## Top-level state object `S`

```js
{
  unit: 'kg' | 'lb',
  restSec: 90,                 // default rest timer seconds
  sound: true, keepAwake: true, gifSize: 'full',
  lang: 'en', theme: 'dark', accent: 'lime', body: 'male'|'female',
  targetW: null,               // body-weight goal line
  effort: null | 'none' | 'rir' | 'rpe',  // per-set effort scale setting (legacy bool: showRir)
  reminder: { on, time: 'HH:MM', tz },
  bodyweight: [ { d: 'YYYY-MM-DD', w } ],          // append-style weigh-in log
  routines:    [ Routine ],
  week:        { <weekday 0-6>: routineId | null },// recurring weekly plan
  dayPlan:     { 'YYYY-MM-DD': routineId | 'rest' },// one-off overrides/reschedules
  exWeights:   { <exerciseId>: lastWorkingWeight },
  workouts:    [ Workout ],    // finished sessions only (see integrity notes)
  active:      Workout | null, // in-progress session — NEVER synced to server
  customEx:    [ Exercise ],   // user-created exercises merged into EXIDX at runtime
  _ts: <ms>                    // sync watermark for last-write-wins
}
```

## Routine (plan template)

```js
{ id, name, emoji,
  prog: 'off'|'linear'|'greyskull'|'double'|'time'|undefined,  // routine-default policy
  ex: [ { id,                    // exercise id (dataset or custom)
          sets, reps, weight,     // classic prescription
          sec, min, speed,        // timed / cardio modes
          repsMin, repsMax,       // double-progression range / bodyweight ceiling
          inc,                    // load step override
          rirTarget,              // MiGym phase 7: target effort (0 = to failure) — informational;
                                  // absent unless chosen in the config sheet
          rest,                   // MiGym phase 7: per-exercise rest seconds; absent = profile default
          note,                   // MiGym phase 3: cue mirrored from sessions
          mode: 'reps'|'time'|'cardio',   // absent = derived from exercise type
          bodyweight: true,       // no external load; w means ADDED weight
          side: true,             // unilateral: logged total covers both sides
          sg: supersetGroupId } ] }
```

## Workout (finished or active session)

```js
{ id, d: 'YYYY-MM-DD', start: <ms>, end: <ms>,
  routineId | null,             // null = freestyle session
  name, bw: <weighIn|null>,
  entries: [
    { id, topW,                 // confirmed working weight
      note,                     // per-exercise note (MiGym phase 3: seeded from routine cfg.note,
                                // mirrored back to the routine on save, kept in history)
      target: {…prescription},  // what was planned (recorded since v1.2.2; may be absent)
      muscleSnapshot: {…},      // per-muscle volume captured at finish
      sets: [ Set ] } ],
  prs: [ … ]                   // PR records detected at completion
}

Set = { done: true,
        w,                     // weight (added weight when entry/bodyweight)
        r,                     // reps (total across sides for unilateral)
        sec | min+speed,       // timed / cardio modes
        rir | rpe,             // optional effort, scale preserved as logged
        phase: 'work'|'warmup' // legacy boolean `warmup: true` also honored
      }
```

## Exercise catalogue

* Built-in: generated module `src/lib/exercises-data.js` (`EXDB`) from the upstream dataset:
  ~1,324 entries `{ id, n(name), bp(bodypart), tg(target), eq(equipment), sm(secondary[]),
  st(instructions), img, gif }`. Media files are fetched at deployment, not committed.
* Custom: stored per-user in `S.customEx`, registered into the runtime index (`EXIDX`)
  on load; behave like built-ins everywhere.
* Muscle names are alias-normalized to 18 drawable muscles via `lib/muscles.js`.

## Server registry (`db.json`)

```js
users:   [ { id, name, created, disabled?, admin?, invitedBy?, sv?, lastReminder? } ]
creds:   [ { id: credentialId, userId, publicKey(b64u), counter, transports[] } ]
subs:    [ { userId, endpoint, keys:{p256dh,auth}, created } ]   // web-push subscriptions
invites: [ { code, note?, createdBy, created, usedBy?, usedAt?, revoked? } ]
```

## Sync & integrity rules

1. Client persists to localStorage immediately (debounced), pushes whole `S` to
   `PUT /api/data` after 1.5 s idle and on tab-hide. The server archives the previous blob
   into a bounded snapshot list (`snapshots/<uid>/`, keep 10) before overwriting
   (ADR-0006 Stage 1).
2. Pull on boot **merges** instead of replacing: `lib/sync.js mergeStates()` unions
   workouts (by id), bodyweight (by date), measurements and custom exercises from both
   sides; configuration sections follow the newer blob as a whole (sections absent from
   the newer side fall back to local). The merged result is pushed back so both ends
   converge. The active workout never merges or leaves the device.
3. Known limitation until Stage 1b (`S._mts` per-section timestamps): two devices changing
   the SAME config section concurrently resolve by blob-level `_ts`. Snapshots make any
   such loss reversible; the restore sheet lists server snapshots and union-merges them.
4. Workouts are appended to `S.workouts` on completion; there is no delete-workout flow in
   the core UI. Corrections happen by editing future prescriptions, not history.
5. Progression targets are *derived*, never stored as counters — no drift between log and plan.

## Export/import formats

* Full backup: JSON of `S` (Settings → export/import).
* Plan share file: routines + week schedule only (no workouts/weigh-ins); merge-on-import.
* Importers: FitNotes / Strong / Hevy CSV (header-mapping dialects, RPE honored),
  Apple Health XML (bodyweight records). Unknown exercise names become custom exercises —
  nothing is dropped.

## Fitness profile & measurements (MiGym Phase 2)

Added to `S` (see `frontend/src/lib/profile.js` — constants, normalisation rules, tests):

```js
S.profile = {              // structured facts; consumed by nothing yet, shaped for later phases
  name: '',                // display name override (≤60 chars)
  image: null,             // ≤256px square JPEG data URL (client-side resized)
  goal: null,              // 'hypertrophy' | 'strength' | 'weight_loss' | 'general' | 'performance'
  experience: null,        // 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: null,       // 1..7 | null
  sessionMinutes: null,    // 5..300 | null
  equipment: [],           // subset of the dataset's own `eq` vocabulary (curated list in lib/profile.js)
  preferences: '',         // free text ≤500 chars
  heightCm: null           // 50..280 | null
}
S.measurements = [         // append-only tape log, same spirit as S.bodyweight
  { d: 'YYYY-MM-DD', k: 'waist', v: 80 }   // k ∈ neck|shoulders|chest|waist|hips|upper_arm|thigh|calf
]
```

Rules: `normalizeProfile` / `normalizeMeasurements` run on every write path (Settings edits,
demo seed) so corrupt backups or hand-edited state degrade to defaults instead of poisoning
the app. Measurements are never rewritten — a correction is a new record; `latestMeasurement`
reads the newest per key. No medical interpretation exists anywhere in this feature.
Old states without these keys overlay onto DEF unchanged; old clients ignore them on sync.

## Planned extensions (not yet implemented)

* Phase 4+: engine modules consume `S` read-only; recommendations carry explanation payloads.
* Phase 10: versioned/per-record sync to replace LWW (design doc required before implementation).
* Profile consumers: progression/analytics/coaching features are expected to read
  `S.profile`/`S.measurements` rather than re-ask the user.
