# MiGym Design System

The single source of truth for visual and interaction decisions. Values marked *(existing)*
are already live in `index.css` and are formalised here; values marked **(new)** are
introduced by the UI/UX redesign (docs/UI-UX-REDESIGN.md). Nothing may use raw values where
a token exists.

---

## 1. Design principles (short form)

Purpose · Agency · Responsibility · Familiarity · Flexibility · Simplicity-not-minimalism ·
Craft · Delight. Emotional target: **calm confidence** — "I know what to do."

## 2. Colour

### Surfaces (existing, kept)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | #000000 | #f2f2f7* | app background |
| `--bg-el` | #0e0e10 | — | elevated backdrop (bars, sheets) |
| `--surface` | #1c1c1e | — | cards, grouped lists |
| `--surface-2` | #2c2c2e | — | pressed, nested fills, controls |
| `--surface-3` | #3a3a3c | — | tracks, off-switches |

### Text

| Token | Value | Use |
|---|---|---|
| `--text-1` (= `--label`) | #ffffff / #000 | titles, primary content |
| `--text-2` (= `--label-2`) | rgba(235,235,245,.60) | subtitles, secondary |
| `--text-3` (= `--label-3`) | rgba(235,235,245,.32) | decorative only — **never** for information-bearing text (audit S-9; instances migrate to text-2) |

### Semantic status (**new** aliases — map onto existing palette, no visual break)

| Token | Dark value | Meaning |
|---|---|---|
| `--color-success` | `--green` #30d158 | completion, positive delta |
| `--color-warning` | `--yellow` #ffd60a | caution, goal line |
| `--color-danger` | `--red` #ff453a | destructive, errors |
| `--color-info` | `--blue` #0a84ff | neutral highlights |
| "live/in-progress" | `--orange` #ff9f0a — **reserved**: only ever means an active session | |

### Accent system

* User-selectable accents remain (`ACCENTS`: lime/sky/orange/violet/pink/red/teal/gold).
* Factory default changes from lime to **Ember**: `#ff7a1a` (pressed `#c2410c`,
  soft = color-mix 16 %). Contrast on dark ≥ 4.5:1 for UI text uses; on-accent text stays
  near-black.
* Accent means *interactive/selected*. It never encodes success/warning/status — those use
  the semantic tokens above.

## 3. Typography

System font stack only (`system-ui`). Sizes in px with rem-friendly components.

| Role | Size/weight | Leading | Tracking | Use |
|---|---|---|---|---|
| display | 30px / 600 | 1.08 | -0.026em | big numbers (weight, tiles) |
| h1 | 22-24px / 600 | 1.15 | -0.02em | screen titles |
| h2/card | 18px / 600 | 1.2 | -0.014em | card headings |
| title | 17px / 600→500 | 1.25 | -0.008em | row titles |
| body | 15px / 400 | 1.45 | 0 | paragraphs |
| small | 13px / 400 | 1.3 | +0.005em | subtitles, metadata |
| caption | 12px / 400 | 1.3 | +0.01em | tags, footnotes |

Rules: hierarchy from weight+size+leading together; tracking scales inversely with size;
no fixed letter-spacing shared across roles; spacing around text uses the space scale.

## 4. Spacing scale

`--space-1:4 · --space-2:8 · --space-3:12 · --space-4:16 · --space-5:20 · --space-6:24 ·
--space-7:32 · --space-8:40 · --space-9:48 · --space-10:64`

Rules: related elements 1 step apart; sections 2–3 steps; screen padding `--space-4`
(= current --pad 16px); bottom safe-area always respected (`--sab`).

## 5. Radius & borders

Radius tokens (existing): `--r-sm:8 · --r:12 · --r-lg:16 · --r-xl:22 · --r-card:14`.
Borders/hairlines: `--hair:.5px` separators inset past the icon rail; full borders only
under reduced-transparency or increased-contrast preferences.

## 6. Elevation & materials

* Flat content: no shadow (surface contrast is the separator).
* Floating layers (tab bar, rest timer, sheets): existing translucent material
  `backdrop-filter:saturate(180%) blur(24px)` + hairline top edge — kept.
* Modal scrim: dim, never stacked on another translucent layer.
* **New fallbacks:** `prefers-reduced-transparency` ⇒ opaque surfaces, no blur;
  `prefers-contrast: more` ⇒ stronger borders, full-opacity text.

## 7. Components (spec anchors — all exist; listed with their rules)

| Component | Rules |
|---|---|
| Button | variants primary/tinted/ghost/plain/danger × md/sm/xs; press scale .975 on :active; disabled 32 %; min touch target 44×44 (xs exceptions documented, never below 40 effective) |
| Icon button | 44×44 default; inline-size overrides require aria-label AND ≥40px |
| Row (`.lrow`) | grouped list row; hairline separators; chevron affordance; press tint |
| Section | title + inset group + optional footer text |
| Segmented | sliding selection pill; used for ≤5 mutually exclusive options |
| Stepper / NumberField / Slider | ± buttons + direct numeric entry; nullable fields clear instead of zeroing; sliders track pointer 1:1 with capture |
| Check | 44px hit area; tick + row-dim as redundant state cues |
| Sheet | bottom sheet, drag-dismiss with velocity, `data-nodrag` opt-out; dialog semantics added by redesign W5 |
| Toast | transient status/completion messages; never for errors requiring action (inline instead) |
| Tag/badge | `.tag`; colour from semantic tokens; never colour-only |
| Tiles | stat blocks; label over value; value font from display role |
| Charts | LineChart/Heatmap/BodyMap — always paired with a textual summary of what they show |
| Empty states | what's missing + why it matters + next action button |
| Loading states | local-first = instant; remote fetches show a labelled loading line; no fake progress |
| Errors | plain language, preserve input, offer retry; sync errors reassure that local data is intact |

## 8. Motion

Tokens (existing): `--fast:140ms · --med:220ms · --ease:cubic-bezier(.32,.72,0,1)`.

Spring presets (for JS-driven gesture motion, per SKILL.md):
* Default UI: critically damped — `damping 1.0`, response ≈ 0.35.
* Momentum/flick interactions (sheet throw, drag release): under-damped — damping ≈ 0.8,
  same response; velocity handed off from the pointer.

Rules: animate `transform`/`opacity` only; start from the current presentation value;
never lock input during transitions; every animation interruptible; motion communicates
origin/path/outcome (sheets rise and settle back down; nothing flies sideways without a
reason); feedback fires on the causal frame (beep/vibrate/tick together).

### Reduced-motion
Replace transforms/springs with opacity cross-fades ≤200ms; keep colour/state changes.
Implemented via targeted media queries replacing the current blanket kill (audit S-3).

## 9. Accessibility tokens & behaviour

* `:focus-visible` ring (exists): 2.5px accent outline, 2px offset.
* `prefers-reduced-motion` → per W13.
* `prefers-reduced-transparency` → opaque surfaces, no backdrop-filter (**new**, audit S-1).
* `prefers-contrast: more` → solid backgrounds, stronger borders, text-2 promoted to
  higher opacity (**new**, audit S-2).
* Text scaling: component spacing in px today; migration to rem for text-adjacent spacing
  happens opportunistically in W3 — layout must not break at 200 % text size.
* Colour independence: every colour-coded state carries a second cue (tick, icon, shape,
  number or label).
* Keyboard: focus trap + Escape + focus restore in sheets; all list rows become real
  buttons (W5).
* Touch targets: ≥44×44 nominal, ≥40×40 absolute minimum with adjacent-spacing
  compensation.

## 10. Do / Don't (condensed from the spec)

DO keep MiGym's dark-first calm identity, its hairline grouped lists, instant local
interactions, and honest empty/error states.
DON'T add glassmorphism showcases, confetti, gamification chrome, gradient washes,
dashboard-template layouts, Apple clones, or any dependency-heavy UI library.
Every visual decision must trace to a UX problem and a token.
