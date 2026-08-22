# MiGym — UI/UX Redesign Plan

Companion to `UI-UX-AUDIT.md` (read that first for evidence and scores).
Constraint reminders honoured: no architecture rewrites, no workout-logic changes without
UX reason, no sync-semantics changes, local-first untouched, existing components improved
over replaced.

---

## 1. Root causes behind every audit finding

| Root cause | Produces |
|---|---|
| RC-1 — The design system predates the feature set: tokens exist but newer screens reached for inline styles and raw palette vars | S-4, S-5, S-6, S-7 |
| RC-2 — Accessibility was treated as "focus outline + reduced-motion kill-switch" | G-1, SH-1, S-3, missing contrast/transparency queries |
| RC-3 — Touch-target minimums were never codified | S-8, R-1, AW-1 |
| RC-4 — No motion system beyond two duration tokens; springs/drag physics only exist in the sheet + slider | §19–§23 gaps; missed direct-manipulation wins |
| RC-5 — Copy drifts because strings live in views | S-10 |

## 2. Strategy

**Token-first, semantics-second, screens-last.** Fix the foundation once (tokens, media
queries, primitives), then sweep screens in priority order. Every change is CSS/class-level
or additive ARIA unless noted. Zero new runtime dependencies (spec §55): springs stay
CSS-transition based for non-gesture motion; existing pointer-tracking code (sheet, slider)
is the model for any gesture work.

## 3. Workstreams mapped to implementation order

### W1 — Design tokens (Phase 1 of §50)
* Add semantic aliases over the existing ramp: `--color-bg/-surface/-surface-2/-elevated`,
  `--text-1/-2/-3`, `--border`, `--success/-warning/-danger/-info` (mapping to current
  values so nothing visually breaks), spacing scale `--space-1..8` (4→64), radius aliases,
  motion tokens (`--motion-fast:140ms`, `--motion-normal:220ms`, spring presets documented
  as constants for JS gestures).
* New default accent per user request ("different colors"): **Ember** `#ff7a1a` /
  pressed `#c2410c`, on-accent stays near-black. Warning moves to `--yellow`; `--orange`
  reserved exclusively for live/in-progress states (removes collision). All 8 user
  accents remain selectable; Ember becomes the factory default.
* Light theme re-derived from same tokens.

### W2 — Typography (§50 Phase 2)
* Type scale table (display 30/28, title 20/17, body 15-16/13, caption 12) with
  size-specific tracking (-0.02em ≥22px → 0 at 15px → +0.01em ≤13px) and leading
  (1.05–1.1 display / 1.25 UI / 1.45 body), codified as utility classes; replace ad-hoc
  letter-spacing values across views (S-6).

### W3 — Global spacing & layout (Phase 3)
* Sweep inline margins/gaps to the space scale in the top-10 offenders first (S-7);
  mechanical replacements only where values already equal a scale step.

### W4 — Buttons & inputs (Phase 4)
* Button matrix formalised (primary/tinted/ghost/plain/danger × sm/md); press feedback on
  `:active` retained everywhere; disabled = 32 % opacity (exists).
* Inputs gain visible labels where placeholders were the only label (SE-1) via a
  `Field` wrapper primitive; inline validation pattern for numeric ranges.

### W5 — Navigation & list semantics (Phase 5)
* New shared `ListItem` primitive (button-based row with role/Enter/focus) adopted by
  Plan/Library/Admin/History/picker rows — fixes G-1/P1-2 product-wide.
* Sheet layer gains `role="dialog" aria-modal="true"`, focus trap, Escape-to-close,
  focus restore — fixes SH-1/P1-1 product-wide.

### W6 — App shell & navigation (Phase 6)
* Tab bar: translucent material kept; add reduced-transparency fallback; active state adds
  a weight/label cue beyond colour (S-4 mitigation). Desktop ≥768 px keeps centred bar
  (already good); no sidebar — out of scope by restraint.

### W7 — Dashboard (Phase 7)
* Home: fix starter-plan copy (S-10/H-1); week-day dots gain a shape cue (ring for planned,
  filled for done); Today-row tag unchanged; streak card links to History (HI-2).

### W8 — Workout interface (Phase 8 — highest priority polish)
* Header: Discard moves to the overflow position with text label on ≥360 px widths; Finish
  keeps both header icon + bottom primary button.
* Set rows: completed state = dim + tick + strikethrough-free weight/reps emphasis
  (colour-independent); per-set aria-labels.
* Rest timer: verify ring contrast; add reduced-motion opacity fallback for the fill.

### W9 — Routines (Phase 9)
* RoutineEdit reorder controls: enlarge to ≥44×32 with visible chevrons + add
  drag-to-reorder later if time allows (direct manipulation win, existing pointer patterns).
* Superset link button gets an accessible name tied to the exercise above.

### W10 — Progress (Phase 10)
* Charts: pair each canvas/svg chart with a one-line text summary (already partially true
  for momentum lists); document the mapping in ST-1 resolution.

### W11 — Profile / W12 — Settings (Phases 11–12)
* Section order review: Profile above Account; AI fields get labels; measurements hint;
  sync-status line surfaced when offline pushes are pending (heuristic #1 fix).

### W13 — Motion system (Phase 14 in §50)
* Codify: sheets enter/exit along the same vertical path with blur+scale materialisation
  (skill §12); press states instant; rest-timer fill transitions colour not just width;
  all gesture-driven motion continues from current presentation value (existing slider/
  sheet code already complies — extend, don't rewrite).
* Reduced-motion: replace blanket kill with targeted rules (opacity cross-fades retained).

### W14 — Accessibility (Phase 15)
* `@media (prefers-reduced-transparency)` → solid surfaces, drop blurs.
* `@media (prefers-contrast: more)` → stronger borders, full-opacity text tokens.
* Contrast verification pass for `--label-3` usages carrying information (S-9): bump those
  instances to `--label-2`.

### W15 — Mobile polish & final regression (Phases 16–17)
* Touch-target sweep completion (≥44×44 or 44×32-with-spacing exceptions documented),
  small-phone pass at 320 px, keyboard-overlap check on forms, full test suite + build +
  manual desktop/mobile inspection, then `UI-UX-AUDIT-FINAL.md` re-scoring.

## 4. Screen-by-screen change list

| Screen | Changes |
|---|---|
| Home | H-1 copy, H-2 dot shapes, HI-2 link, accent swap ripple |
| Plan | ListItem semantics, empty-state buttons |
| RoutineEdit | R-1 controls enlarged/labelled, drag-reorder (stretch) |
| Start chooser | none beyond tokens |
| Workout | AW-1 header separation+labels, AW-2 done-state redundancy, AW-4 aria |
| Library | L-1 chip collapse behaviour, ListItem semantics |
| Stats | ST-1 summaries, ST-2 tile classes, semantic colours |
| History | HI-1 empty guidance, ListItem semantics |
| Settings | SE-1 labels, SE-2 order, sync-status line, Coach/AI section input primitives |
| Sheets | SH-1 dialog semantics/focus (W5) |
| Admin | ListItem semantics |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Token aliasing breaks themes/accents | Aliases map onto existing values first; visual diff via running dev server after each workstream |
| ListItem conversion changes event/test expectations | Component tests updated alongside; rows keep identical DOM classes |
| Focus trap regressions (sheets with pickers inside) | Trap only Tab cycling; existing Android back/history integration untouched; tested per sheet |
| Colour change alienates existing users | Accent remains a user setting; only the factory default changes; light theme re-derived from same tokens |
| Inline-style sweep touches many files | Only mechanical same-value migrations in W3; no behavioural edits mixed in |

## 6. Complexity estimates

| Workstream | Size | Notes |
|---|---|---|
| W1 tokens | S | pure CSS additions |
| W2 typography | S-M | class + view sweep |
| W3 spacing | M | mechanical, wide |
| W4 inputs/buttons | M | primitive + Settings forms |
| W5 nav/list semantics | M-L | ListItem + sheet dialog (system-wide) |
| W6 shell | S | CSS mostly |
| W7 dashboard | S | copy + dot shapes + link |
| W8 workout | M | header, aria, timer CSS |
| W9 routines | S-M | control resize; drag optional L |
| W10 progress | S | summaries |
| W11/W12 profile/settings | M | labels/order/status line |
| W13 motion | S-M | CSS + documented presets |
| W14 a11y queries | S | two media blocks + contrast fixes |
| W15 regression | M | audit-final doc + sweeps |

## 7. Acceptance gates

Each workstream ends with: tests green (no NODE_OPTIONS needed), build green, locale check
green, dev-server inspection desktop+mobile-width, and a commit. Final gate repeats the
audit scoring into `docs/UI-UX-AUDIT-FINAL.md`.
