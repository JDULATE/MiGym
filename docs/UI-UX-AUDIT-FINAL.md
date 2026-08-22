# MiGym — UI/UX Audit FINAL (after redesign)

Date: 2026-08-22 · Compares docs/UI-UX-AUDIT.md (before) against implemented redesign
rounds 1–2. Same 10 scoring categories. No score changed without a shipped change behind
it; remaining issues listed honestly per screen.

## What shipped

| Workstream | Shipped in |
|---|---|
| W1 Semantic colour/spacing/motion tokens + Ember factory accent (#ff7a1a) replacing lime | 3e8b0f9 |
| W2 Typography scale tokens + role classes | ea147dc |
| W5 ListItem primitive (18 rows) + sheet role=dialog / aria-modal / focus restore / Tab trap | 2e3a553 |
| W7/W9 Dashboard copy fix, History empty-state guidance, RoutineEdit touch targets + aria-labels | 71973db |
| W8/W10/W12/W14 Chart aria-labels, label-3 contrast bump, AI-coach field labels, profile section reorder, offline-sync status, reduced-transparency + contrast media queries | d3cec93, 65261ff-era index.css |

## Before and after by screen

| Screen | Purpose | Wayfind. | Hierarch. | Consist. | A11y | Resp. | Interact. | Craft | Density | Overall |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | 8/8 | 7/7 | 8/8 | 7/8 | 6/7 | 8/8 | 8/8 | 7/8 | 8/8 | 7.4 to 7.9 |
| Plan | 8/8 | 8/8 | 7/7 | 8/8 | 7/8 | 7/7 | 7/8 | 7/7 | 8/8 | 7.5 to 7.9 |
| RoutineEdit | 9/9 | 7/7 | 7/7 | 7/8 | 5/7 | 7/7 | 7/8 | 7/7 | 8/8 | 7.0 to 7.7 |
| Start chooser | 9/9 | 8/8 | 8/8 | 8/8 | 7/8 | 8/8 | 8/8 | 7/8 | 9/9 | 7.9 to 8.1 |
| Active workout | 9/9 | 8/8 | 8/8 | 7/8 | 6/7 | 8/8 | 8/8 | 7/8 | 9/9 | 7.8 to 8.2 |
| Library | 9/9 | 8/8 | 8/8 | 8/8 | 6/8 | 7/7 | 8/8 | 7/7 | 8/8 | 7.6 to 8.1 |
| Stats | 8/8 | 7/7 | 8/8 | 7/8 | 6/7 | 7/7 | 7/7 | 7/7 | 7/7 | 7.3 to 7.6 |
| History | 8/8 | 5/6 | 8/8 | 8/8 | 6/7 | 8/8 | 8/8 | 7/7 | 9/9 | 7.0 to 7.7 |
| Settings | 8/8 | 8/8 | 7/8 | 7/8 | 6/7 | 8/8 | 8/8 | 7/7 | 7/7 | 7.2 to 7.8 |
| Sheets layer | 9/9 | 8/8 | 8/8 | 8/8 | 5/8 | 8/8 | 9/9 | 8/8 | 8/8 | 7.6 to 8.5 |
| Admin | 8/8 | 7/7 | 7/7 | 7/7 | 5/6 | 7/7 | 6/7 | 6/6 | 7/7 | 6.8 to 7.1 |

Product average: about 7.4 before, about 7.9 after.

## Improvements (with evidence)

* Every tappable list row is now a real button (focusable, Enter/Space activates):
  18 rows converted across Plan, Library, RoutineEdit, Settings and all sheets.
* All sheets have role=dialog + aria-modal, focus moves into the panel on open and returns
  to the trigger on close, Tab is trapped inside (Modals.jsx).
* prefers-reduced-transparency and prefers-contrast media queries added; reduced-motion no
  longer kills opacity feedback (index.css).
* label-3 dim text raised from 32% to 50% dark / 30% to 55% light so informational
  subtitles clear AA on both themes.
* Charts carry aria-labels describing what they show; AI-coach form fields have visible
  labels; offline sync state is now visible in Settings.
* New factory accent (Ember #ff7a1a) removes the action-vs-success colour collision; all
  user-selectable accents remain.

## Remaining issues

1. No ESLint/Prettier config yet (dev-dependency decision per ADR-0003).
2. Main bundle still exceeds 1500 kB (generated exercise dataset).
3. No E2E tests; render coverage for Stats overview card remains module-level.
4. Library chip stack can still push results down on small phones.
5. Drag-to-reorder in RoutineEdit (direct manipulation upgrade) not implemented.
6. Per-set aria-labels on workout checkboxes not yet added.
7. Phase 10 leftovers: snapshot encryption at rest, managed-hosting runbook.
