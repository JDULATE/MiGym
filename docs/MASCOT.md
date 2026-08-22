# MASCOT.md — Giwi

**Mascot:** Giwi — MiGym's official visual companion.
**Implementation reference:** Bloub (https://bloub.vercel.app/) — technical study only.
**Product:** MiGym.

User-facing copy always says **Giwi**. "Bloub" may appear only here and in technical
notes describing the reference study.

## 1. Relationship to Bloub (and why we don't reuse it)

Bloub is an animated-SVG recreation of **the x.ai bot's avatar**, with shapes
"pixel-traced from the reference video". Two hard conclusions from the research:

1. Its character artwork is a derivative of x.ai's design — reusing Bloub's traced paths
   or assets would import that IP exposure into MiGym, regardless of Bloub's own code.
2. Its *technique*, however, is deliberately dependency-free: plain SVG shapes morphed
   without any animation library.

**Decision (option 3 + 5 from the spec):** treat Bloub purely as proof-of-feasibility and
visual inspiration. Giwi is an **original character** implemented locally as hand-authored
SVG + CSS motion. No Bloub assets, paths, fonts, or code are copied. Nothing user-facing
references Bloub.

## 2. Architecture

```
src/giwi/
├── Giwi.jsx          // <Giwi state size /> — the SVG character (pure, presentational)
├── GiwiBubble.jsx    // speech bubble wrapper (text + optional action button)
├── giwi.css          // all mascot motion (state classes, reduced-motion fallbacks)
└── dialogue.js       // centralized dialogue keys resolved through the app i18n (t())
```

* No new runtime dependencies (no animation library — CSS keyframes + transitions only).
* The rest of the app imports only `<Giwi … />` and dialogue helpers; swapping the mascot
  implementation later touches exactly this folder.

## 3. States (extensible set)

| State | Visual | Used for |
|---|---|---|
| `idle` | gentle breathing | default presence |
| `welcome` | slight bounce + open eyes | welcome screen |
| `thinking` | eyes look up, subtle tilt | questions being asked |
| `point` | lean toward the bubble | walkthrough hints |
| `happy` | curved eyes, small hop | positive answers |
| `encourage` | slow nod | between steps |
| `celebrate` | jump + squash/stretch | completion, milestones |

States map to CSS classes (`.giwi--happy` etc.). If a future state has no artwork it
falls back to `idle` — no fake partial animations.

## 4. Character design

Ten pre-animated expression SVGs (250×250, self-contained CSS keyframes, ~16 kB each)
provided as MiGym project assets under `src/giwi/expressions/`:

`neutral · happy · excited · attentive · curious · shy · surprissed · unimpressed · scared · angry`

They are embedded via `<img>` (animations run because the keyframes travel inside each
file) which also isolates their styles from the app. State→expression mapping lives in
`Giwi.jsx`; unused expressions (`angry`, `unimpressed`, `scared`) are shipped for future
contextual moments.

## 5. Accessibility

* Pure inline SVG with `role="img"` + `aria-label` ("Giwi, the MiGym mascot").
* All Giwi dialogue is real text next to the character — nothing is conveyed by the
  mascot alone.
* `prefers-reduced-motion: reduce` disables breathing/hop/jump keyframes (static pose
  keeps eyes and posture); dialogue content unchanged.

## 6. Failure behaviour

The mascot is decoration: every Giwi surface renders inside an error boundary scoped to
the mascot. If SVG rendering ever throws, the boundary removes the figure and onboarding
continues text-only. MiGym never depends on Giwi to function.

## 7. Performance

Inline SVG (~1–2 KB) + a few CSS keyframes; no images, no libraries, lazy-loaded with the
onboarding chunk. After onboarding completes, Giwi is not rendered at all until a
contextual moment asks for it.
