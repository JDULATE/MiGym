# TUTORIAL.md — the interactive walkthrough

A spotlight tour over the **real** MiGym interface — no mock screens, no second UI.

## Engine

```
src/giwi/
├── tutorial/
│   ├── steps.js        // declarative step list (id, target selector, copy keys, placement)
│   ├── Tutorial.jsx    // controller: overlay + spotlight + tooltip + progress
│   └── useSpotlight.js // measures the target element, tracks resize/scroll
```

* Spotlight = a fixed overlay with a cut-out over the target's bounding box
  (`box-shadow: 0 0 0 9999px rgba(0,0,0,.6)` technique) + rounded highlight.
* Tooltip hosts Giwi (small) + title + body + Continue / Skip.
* Targets are real elements marked `data-giwi="<step>"` in the existing components
  (additive attributes only — no behaviour changes).
* If a target is missing (e.g. empty state variant), the step renders centred without a
  cut-out instead of failing.

## Steps (v1)

| # | id | Target (`data-giwi`) | Copy theme |
|---|---|---|---|
| 1 | dashboard | Home today-card | "This is your home: today's session lives here." |
| 2 | plan | Tab bar ▸ Plan | "Routines and your week are organised here." |
| 3 | start | Tab bar ▸ Start button | "When you're ready, start your workout from here." |
| 4 | exercise | Workout exercise block | "The current exercise, your previous performance and notes." |
| 5 | setlog | Set rows / steppers | "Log weight, reps and (optionally) effort per set." |
| 6 | rest | Rest timer area | "The rest timer starts after each set." |
| 7 | progress | Stats tab | "Progress, PRs, volume and consistency over time." |

Steps 4–6 require an active session; if the user skips starting one, those steps render
centred ("you'll see this during your first workout") so the tour still completes.

## State

Device-local key `migym_tutorial_v1`:
`{ completed, skipped, version, currentStep }` — `currentStep` lets an interrupted tour
resume where it left off.

## Completion / skip / restart

* Continue advances; the last step writes `{completed:true}`.
* Skip writes `{completed:true, skipped:true}` at any point.
* Restart from Settings resets only tutorial state and relaunches.
* Versioning: bumping `TUTORIAL_VERSION` offers (never forces) the new tour via Settings.

## Accessibility

* Overlay is keyboard-navigable (Continue/Skip are buttons), Escape skips nothing silently
  — Escape behaves like Skip-confirm to prevent accidental loss of place… v1: Escape =
  advance-free close via Skip confirm.
* Spotlight keeps ≥4.5:1 contrast for tooltip text; reduced-motion replaces movement with
  fades; targets scroll into view before measuring.
