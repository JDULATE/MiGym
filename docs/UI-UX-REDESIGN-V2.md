# UI V2 — Rebuild plan (user-authorized override)

Status: approved by Jorge 2026-08-24. This document **explicitly overrides** the earlier
"do not rewrite" constraint of the Round-1/2 redesign spec, scoped as decided below.
Everything else in that spec (principles, accessibility bars, acceptance gates) remains law.

## Scope contract

KEEP untouched (the engines — they carry the product's value and their 422 tests):
- `frontend/src/lib/**` business logic · `store/**` state+sync · `lib/api.js`
- `locales/**` (924 keys ×11) · `giwi/expressions/**` artwork · PWA files · API server

DELETE / REPLACE (the visual layer only, screen by screen once parity is reached):
- `views/**`, `components/**`, old TabBar/App shell, old Giwi onboarding + tutorial flow.

## Pillars

1. **Fluid interfaces** (SKILL.md): respond on pointer-down · 1:1 drag with grab offset ·
   interruptible springs animating from presentation value · velocity handoff at release ·
   momentum projection `(v/1000)·d/(1−d)`, d≈0.998 · rubber-band boundaries · symmetric paths.
2. **Springs**: critically damped default (`damping 1.0`, `response 0.3–0.4`). Bounce
   (`~0.8`) only for momentum-driven gestures. Reduced-motion → cross-fades, no slides.
3. **Materials**: translucent chrome via backdrop-filter where content scrolls beneath;
   never stacked glass; solid surfaces win for readability.
4. **Typography**: system font; size-specific tracking (tight display, ~0 body); hierarchy
   from weight+size+leading sets; rem-based so text scaling never breaks layout.
5. **Giwi lives**: not a static image — a character with idle float, pointer awareness,
   draggable momentum, squash-stretch reactions, expression changes tied to app events.
6. **No new dependencies**: hand-rolled spring engine (ADR-0003). Compositor-friendly
   properties only (transform/opacity).

## Onboarding & tour (rebuilt, not deleted)

Old questionnaire/tour are deprecated. New flow (later phase): a playable Giwi welcome —
he follows the finger, celebrates first inputs; questions become conversational cards with
spring transitions. Zero dead-end screens; skippable everywhere.

## Screen parity order (each gates on tests+lint+build+manual mobile/desktop)

Shell+tokens → Home → Workout (highest priority) → Plan/Routines → Stats → Library →
Coaches hub → Settings → Admin → new Onboarding/Tour → cleanup of legacy views.

## Living here

New code under `src/v2/**`. Old app keeps running until each screen flips. Demo/playground
route: `/v2`.


## DECISION — style crowned (2026-08-25)

Bake-off result: **AURORA** wins, with Editorial press physics (.pressable scale on every
tappable surface) adopted as the standard interaction motion. Aurora palette (deep #155a9e →
#3b93f0 → light #7db8f5, blue-only gradients — no amber in gradients) becomes the V2 design
system base. Losing candidates stay at /styles for reference until Workout V2 ships.


## CLOSURE (2026-08-25)

The V2 rebuild was REJECTED after the workout-skin prototype: user verdict — not
user-friendly, original front retained. All /v2 routes and src/v2/** were removed from main;
recoverable from local commits 7ab9c4e…e1ef952 if ever revisited. Kept from this cycle:
ErrorBoundary technical-details disclosure. The coach marketplace + Round-3 IA (original
design language) remain in force.
