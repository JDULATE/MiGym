# ONBOARDING.md — Giwi first-launch experience

## Flow

```
App boot → onboarding completed? ── yes ─▶ normal MiGym (Giwi absent)
                        │ no
                        ▼
        Giwi welcome ("Hola, soy Giwi")
                        ▼
   Name → Age → Weight → Height → Goal
                        ▼
        Confirmation summary (Editar / Confirmar)
                        ▼
        tutorial.completed = false → walkthrough starts
```

## State & persistence

| Data | Where | Why |
|---|---|---|
| Profile fields (name, age, weight, height, goal) | `S.profile` (+ first weigh-in appended to `S.bodyweight`) | existing synced profile model — no duplicate system |
| Onboarding/tutorial flags | **device-local** localStorage key `migym_onboarding_v1` (`{completed, skipped, version}`) | per ADR-0006/0007 philosophy: tutorial progress is device-local by default; profile data rides the normal sync rules |

First-launch detection: the flag key is absent on a fresh install. Existing users who
already have data get the welcome card variant with a "Skip" that simply writes
`{completed:true}` without touching anything.

## Field rules

| Field | Storage | Validation |
|---|---|---|
| Name | `S.profile.name` | required, trimmed, ≤60 |
| Age | `S.profile.ageYears` *(new field)* | integer 10–100 |
| Weight | new entry in `S.bodyweight` `{d: today, w}` in the active unit | > 0, unit-aware (kg/lb follows `S.unit`) |
| Height | `S.profile.heightCm` | 50–280 (cm; imperial input is a documented later addition) |
| Goal | `S.profile.goal` | one of the existing GOALS |

No medical interpretation. No data leaves the device.

## Skip / restart

* Every screen shows a secondary "Skip" — writes `{completed:true, skipped:true}`.
* Settings ▸ Help ▸ "Redo the walkthrough" resets only the local flag and relaunches it;
  it never touches workouts, routines, history, settings or sync.

## Versioning

`version: 1`. Future walkthrough revisions bump `TUTORIAL_VERSION`; users who already
completed an older version are *offered* (not forced into) the new tour via a small row in
Settings.

## Offline

Everything is local: airplane mode changes nothing. Reopening after completion never
replays onboarding.
