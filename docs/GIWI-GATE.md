# Giwi Implementation Gate

Approved constraints (client review, 2026-08-22) turned into concrete engineering decisions.
Nothing below changes product architecture; ADR-0005/0006/0007 remain untouched.

## 1. src/giwi architecture plan

```
src/giwi/
├── index.js            public API: <GiwiLayer /> + helpers (nothing else imports deeper)
├── Giwi.jsx            SVG mascot, props {state, size} — pure presentational
├── GiwiBubble.jsx      speech bubble {text, children(actions)}
├── GiwiBoundary.jsx    error-isolation wrapper (mascot failures render nothing)
├── giwi.css            mascot + bubble + spotlight styles (all keyframes)
├── dialogue.js         dialogue keys → t(); centralised copy
├── useGiwiFlags.js     device-local onboarding/tutorial flags (localStorage)
└── tutorial/
    ├── steps.js        declarative steps [{id, target:'data-giwi value', titleKey, bodyKey}]
    └── Tutorial.jsx    controller: overlay + spotlight cut-out + tooltip + progress dots
```

Public surface used by the app: `<GiwiLayer />` mounted once in `App.jsx` (renders
onboarding OR walkthrough OR nothing), plus `restartTutorial()` exported from
`index.js` for the Settings entry. No other file reaches into `src/giwi/`.

## 2. Onboarding state model (device-local)

`localStorage["migym_onboarding_v1"]`

```json
{ "completed": false }
```

* Absent key ⇒ first launch ⇒ show welcome.
* Written `{completed:true}` after profile confirmation (or skip).
* Never read by anything outside the Giwi layer.

## 3. Tutorial state model (device-local)

`localStorage["migym_tutorial_v1"]`

```json
{ "completed": false, "skipped": false, "version": 1, "currentStep": null }
```

* Written at every step advance (resume support) and on completion/skip.
* `TUTORIAL_VERSION = 1`; bumping offers the tour again via Settings, never forces.
* Completing/skipping the tutorial writes ONLY this key.

## 4. Target attribute map (stable hooks)

| Step | Attribute | Added to |
|---|---|---|
| home-today | `data-giwi="home-today"` | Home today-row card |
| navigation-routines | `data-giwi="navigation-routines"` | Tab bar Plan button |
| start-workout | `data-giwi="start-workout"` | Tab bar Start button |
| exercise | `data-giwi="exercise"` | Workout ExerciseBlock media/title container |
| set-row | `data-giwi="set-row"` | First workout set row |
| rest-timer | `data-giwi="rest-timer"` | RestTimer root (when visible) |
| stats | `data-giwi="stats"` | Tab bar Stats button |

Resolution: `document.querySelector('[data-giwi="…"]')`, visibility check
(`offsetParent !== null` + non-empty rect), `scrollIntoView({block:'center'})` before
measuring. Missing/invisible target ⇒ step renders centred without cut-out (never crashes).

## 5. Profile backward-compatibility plan

* `EMPTY_PROFILE.ageYears = null` (new field, additive).
* `normalizeProfile`: integer clamp 10–100, absent/invalid ⇒ `null`. Existing profiles
  without the field stay byte-valid and fully functional.
* Nothing outside Giwi onboarding requires `ageYears`.
* Weight question appends `{d: today, w}` to the **existing** `S.bodyweight` log in the
  active unit — no weight on the profile object, single source of truth preserved.

## 6. Test plan

| Suite | Covers |
|---|---|
| `lib/giwi.test.js` (new) | flag read/write defaults; step list shape (ids unique, targets defined, ordered); target-resolution helper (found / missing / invisible); dialogue keys exist in en source |
| extend `profile.test.js` | ageYears normalisation (missing, invalid, bounds) |
| `views/GiwiFlow.test.jsx` (new) | fresh install shows welcome; completing writes flag + profile fields; skip writes completed+skipped; existing user (flag present) never sees it |
| regression | full suite + build must stay green (418+ tests today) |

## 7. Incremental commits

1. `feat(giwi): ageYears profile field` (+ tests)
2. `feat(giwi): mascot foundation (SVG, states, css)` (+ smoke test)
3. `feat(onboarding): welcome + profile setup flow`
4. `feat(tutorial): spotlight engine and real-UI walkthrough`
5. `feat(giwi): settings restart entry + completion wiring`
6. `test/docs(giwi): coverage and documentation`
