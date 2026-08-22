# MiGym — Product

MiGym is an open-source fitness platform: plan training, run guided workouts, track every
set and your body, understand your progression. It is built on openGym (AGPL-3.0) and keeps
its promise: **your data stays yours** — self-hosted or on-device, no subscription required,
no telemetry.

## Who it is for

1. **Individual lifters** who want a fast, gym-first tracker they actually own.
2. **Self-hosters** who run the Docker stack for themselves, family or a small group.
3. Later: **coaches** managing clients, **gyms** managing members (paid service tiers).

## Product pillars

1. **The workout screen is the product.** Fast to use between sets; large touch targets;
   minimal navigation; clear state; rest timer; previous performance visible.
2. **Explainable progression.** Every recommended number says *why* it is that number.
   Deterministic rules first; AI only summarizes/interprets on top, never overrides.
3. **Data integrity.** Training history is sacred: append-only records, corrections preserve
   history where practical, one-tap export in a documented format.
4. **Own your deployment.** The self-hosted Community edition remains fully functional,
   forever, with no cloud dependency.

## Editions (planned; nothing is paywalled during initial phases)

| Edition | Status | Scope |
|---|---|---|
| **Community** | exists today (inherited) | self-hosted, workout tracking, routines, exercise library (1,324 exercises + custom), progression, analytics, PWA + Android app, import/export, 12 languages |
| **Cloud** | future | managed hosting, multi-device sync done properly, backups, automatic updates |
| **Pro** | future | advanced analytics, long-term progression analysis, AI Coach |
| **Coach** | future | client management, routine assignment, progress review, notes, adherence |
| **Gyms** | future | B2B: members/coaches/plans/attendance/analytics, white-label, strict tenant isolation |

No payments/billing code is written until Phase 13, and only after the open core is stable.

## Non-goals

* Medical advice, injury diagnosis, or health claims.
* Social feed / community features (not part of the vision).
* Locking existing openGym functionality behind a paid tier.

## Feature map (inherited from openGym at fork time)

Already working: weekly plan per weekday with rescheduling; guided workouts with weight
prefill, rest timer, PR detection; supersets (planned and mid-session); warm-up sets excluded
from all stats; timed exercises (planks/carryies) with work timer; cardio logging (time +
speed); bodyweight exercises progressing in reps/sets; reps-per-side handling; RIR/RPE effort
per set; four progression policies + deloads with explanations; estimated 1RM (capped at 12
reps); muscle map in balance/fatigue/strength modes; activity heatmap; bodyweight chart with
goal line; freestyle sessions; custom exercises; equipment filtering; starter plans; plan
share/print; CSV import (FitNotes/Strong/Hevy) + Apple Health weight import; JSON backup
export/import; passkey auth with multi-device sync and guest mode; optional admin dashboard
with invites; push notifications (rest timer + day reminders); wake-lock; 12 UI languages;
standalone Android app; read-only MCP server for local LLMs.

See [ROADMAP.md](ROADMAP.md) for what MiGym adds, phase by phase.
