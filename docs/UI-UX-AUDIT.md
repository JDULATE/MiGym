# MiGym — UI/UX Audit

Date: 2026-08-22 · Scope: full application as of Phase 14 · Auditor method: code inspection
(every view/component/CSS block read), heuristic evaluation (Nielsen set, §46 of the spec),
Apple-design-principles review per `SKILL.md`, and live verification against the running
dev instance (API :3000 + Vite :5173 + media :8888).

> Note on referenced material: `docs/MASCOT.md`, `docs/ONBOARDING.md`, `docs/TUTORIAL.md`
> do **not exist** in this repository, and there is no mascot ("Giwi") anywhere in the
> product. All Giwi/mascot/onboarding-doc sections of the spec are marked **N/A** where they
> appear; onboarding today consists solely of the Home welcome card (evaluated as such).

---

## 1. Screen inventory

| # | Screen | File | Route |
|---|---|---|---|
| 1 | Home / dashboard | `views/Home.jsx` | `/home` |
| 2 | Plan (week schedule + routines) | `views/Plan.jsx` | `/plan` |
| 3 | Routine editor | `views/RoutineEdit.jsx` | `/plan/r/:id` |
| 4 | Workout start chooser | `views/Workout.jsx` (`StartChooser`) | `/workout` |
| 5 | Active workout | `views/Workout.jsx` (`ActiveWorkout`, `ExerciseBlock`) | `/workout` |
| 6 | Library | `views/Library.jsx` | `/library` |
| 7 | Stats hub | `views/Stats.jsx` | `/stats` |
| 8 | History | `views/History.jsx` | `/history` |
| 9 | Settings | `views/Settings.jsx` | `/settings` |
| 10 | Admin dashboard | `views/Admin.jsx` | `/admin` |
| 11 | Sheets/modals layer (~20 sheets) | `sheets.jsx`, `Modals.jsx`, `components/ui.jsx` | overlay |
| — | Login screen | **removed in Phase 10** (ADR-0005) | — |

Shared systems audited: design tokens & CSS (`index.css`, 934 lines), control primitives
(`ui.jsx`: Button/Segmented/Switch/Stepper/Slider/Check/Row/Section/SelectRow/TextField/
NumberField), icon set (`Icon.jsx`), tab bar, rest timer, toasts.

---

## 2. Systemic findings (apply across screens)

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| S-1 | **P1** | **No `prefers-reduced-transparency` support.** 6 `backdrop-filter` surfaces (tab bar, sheet, timer, modal scrim) have no solid fallback; users with the transparency preference get stacked translucency over moving content. | `index.css` lines 280, 539, 617, 650, 837 |
| S-2 | **P1** | **No `prefers-contrast: more` support.** No media query exists; hairline separators (0.5px, ~34 % alpha) and dim text are fixed. | `index.css` tokens block; grep confirms zero occurrences |
| S-3 | **P1** | **Blanket reduced-motion kill.** `*{animation:none!important;transition:none!important}` removes *all* feedback, including the opacity cues that should replace motion per spec §30. Rest timer ring, set-complete tint and sheet dismissal lose their transition entirely rather than degrading gracefully. | `index.css:139` |
| S-4 | **P2** | **Accent colour is overloaded.** `--acc` simultaneously means "primary action", "active tab", "selected chip", "PR badge", "link colour", "checkmark". Colour alone therefore cannot distinguish action from status from selection — violates "do not use colour as the only indicator". | `TabBar.jsx`, `Library.jsx` chips, `Home.jsx` tags |
| S-5 | **P2** | **Semantic status colours are used ad hoc**, inline (`var(--orange)`, `var(--yellow)`) rather than through semantic tokens (success/warning/danger/info). Every new screen re-invents the mapping. | `Settings.jsx` rows, `Stats.jsx` tiles, `Home.jsx` delta colouring |
| S-6 | **P2** | **Typography tracking is ad hoc**: `-0.012em / -.021em / -.026em / -.028em` appear in different components with no scale rationale; small text sometimes uses negative tracking (spec §11 wants slightly positive at small sizes). | grep across views; `.lrow-t`, headers, buttons |
| S-7 | **P2** | **Inline style objects carry layout decisions** (margins/gaps/font sizes) in most views instead of classes/tokens → inconsistent spacing rhythm and duplicated values (e.g. `marginBottom: 8` appears ~40×). | all views |
| S-8 | **P2** | **Touch targets below 44 px** in several dense controls: routine reorder arrows (28×24 px), icon buttons at 30×30 in the week strip, xs buttons (~26 px tall). | `RoutineEdit.jsx:74-75`, `Home.jsx:56-58`, `ui.jsx .btn.xs` |
| S-9 | **P3** | **Dim-text contrast risk**: `--label-3` (rgba(235,235,245,.32)) on `#000` computes ≈ 4.0:1 — borderline for AA on the "small dim" subtitles that often carry real information. Needs verification per usage; some uses are decorative, others are not. | `index.css` tokens; usage across views |
| S-10 | **P3** | **Stale copy**: Home welcome card still says "Load starter plan (PPL)" but the action now opens the three-template picker (Phase 7); Settings footer still links upstream repo as "source code" without MiGym context. | `Home.jsx:84`, `Settings.jsx:198-199` |

### What is already good (must be preserved)

* Token-driven theming exists (surfaces ramp, label ramp, radii, motion tokens) with dark +
  light themes and 8 user accents — a real design system foundation, not scatter.
* Press feedback on pointer-down (`.btn:active{scale(.975)}`, row press tints) ✓ spec §14.
* `:focus-visible` outline styled globally ✓ keyboard baseline.
* `prefers-reduced-motion` handled, if too bluntly (S-3).
* Hairline inset list separators, grouped-list pattern, bottom sheet system — coherent and
  familiar; local-first makes every interaction instant (spec §37 satisfied by design).
* Empty states are mostly explanatory with a next action ("No exercises yet — add your
  first one", starter-plan card), not bare "No data".

---

## 3. Screen-by-screen audit & scores

Scores: 1–10 per category (Purpose / Wayfinding / Hierarchy / Consistency / Accessibility /
Responsiveness / Interaction / Craft / Density / Overall). Evidence cited for every score.

### 3.1 Home (`/home`)
Purpose 8 — answers "what today?" within a second: week strip → Today row (start/resume)
is the dominant element; body-weight and streak secondary. Wayfinding 7 — title + date;
gear icon to Settings; no explicit "you are on Home" beyond the active tab. Hierarchy 8 —
big weight figure, clear card grouping. Consistency 7 — mixes token classes with inline
styles; stale "(PPL)" copy (S-10). Accessibility 6 — week-day dots encode state by colour +
small dot size; day cells are tappable but small (~40 px); aria-labels present on chevrons.
Responsiveness 8 — single column, narrow container; chart scales. Interaction 8 — tap
targets mostly ≥44; week strip cells borderline. Craft 7 — good rhythm; ad-hoc tracking
values. Density 8 — three cards, no clutter. **Overall 7.4**

Issues: H-1 (P2) welcome-card starter copy stale (S-10); H-2 (P2) week-strip dots rely on
colour + tiny dot (add shape/label cue); H-3 (P3) gear icon alone may not say "Settings"
to new users.

### 3.2 Plan (`/plan`)
Purpose 8 — week schedule + routines clearly separated into two columns on wide screens,
stacked on mobile. Wayfinding 8 — title/subtitle, share icon has tooltip+aria. Hierarchy 7
— day list dominates; routines list secondary; "New" button small but labelled.
Consistency 8 — grouped lists reuse `.item`. Accessibility 7 — rows are divs with onClick
(**not buttons** → no focus/keyboard activation; recurring pattern across lists, see G-1).
Responsiveness 7 — two-column `.cols` collapses; day rows comfortable. Interaction 7 —
tap targets fine; no swipe/drag reorder here. Craft 7. Density 8. **Overall 7.5**

Issues: P-1 (P1, systemic G-1) clickable `div.item` rows lack role/tabIndex/Enter handling;
P-2 (P3) empty state offers starter plan button but not "New routine" beside it.

### 3.3 Routine editor (`/plan/r/:id`)
Purpose 9 — editing the routine IS the screen; muscle-coverage map while building is a
differentiator. Wayfinding 7 — back chevron to Plan, name editable inline (good), but no
confirmation the rename persisted. Hierarchy 7 — exercise rows clear; progression SelectRow
above the fold. Consistency 7 — superset affordance explained twice in prose (bottom hint +
row buttons). Accessibility **5** — move up/down buttons are 28×24 px (S-8), icon-only,
relied upon for ordering; link-superset toggle 32×28 icon-only; both lack visible labels.
Interaction 7 — reorder via tiny chevrons instead of drag/direct manipulation (spec §18
opportunity). Responsiveness 7. Craft 7. Density 8. **Overall 7.0**

Issues: R-1 (**P1**) sub-44px icon-only ordering controls (S-8 evidence); R-2 (P2) consider
long-press/drag reorder later; R-3 (P3) delete-routine sits at the very bottom — fine, but
confirm copy already good.

### 3.4 Workout start chooser
Purpose 9 — today's plan card dominant, other routines secondary, freestyle tertiary.
Wayfinding 8. Hierarchy 8. Consistency 8. Accessibility 7 — items are clickable divs
(G-1 again). Responsiveness 8. Interaction 8. Craft 7. Density 9. **Overall 7.9**

Issues: WSC-1 (P3) "rest day, but no one's stopping you" tone is delightful — keep.

### 3.5 Active workout — highest-priority surface
Purpose 9 — current exercise + its sets dominate; progress bar + counter in header; prev-
performance and note directly under the title; everything else demoted. Matches spec §16
priorities well already.
Wayfinding 8 — "Exercise 3 / 5", Prev/Next buttons, superset labelling.
Hierarchy 8 — steppers large; completion checkbox distinct; warm-up phase separated.
Consistency 7 — header actions (Discard ✕ / Finish ✓) are small icon buttons at top;
finish ALSO exists as a big bottom button (good redundancy), but Discard sits one pixel-
field away from Finish — mis-tap risk during a sweaty session (guarded by confirmSheet,
which mitigates to P2).
Accessibility 6 — steppers are ±buttons+input (good), but set-complete Check is a bare
checkbox with no per-row label tying it to "Set 2 of Bench Press"; header icon buttons
lack text; colour-only "done" row state (dimmed + tick).
Interaction 8 — check-off triggers beep/vibrate/rest/superset-advance immediately
(pointer-up though, not down — minor); weight cascade works 1:1.
Craft 7 — dense but ordered; inline styles throughout.
Density 9 — exactly the right data, nothing extra.
**Overall 7.8**

Issues: AW-1 (**P1**) pair Discard/Finish icon buttons in the header — separate spatially
(discard far-left is OK) but add text labels or larger hit areas; AW-2 (P2) completed-set
state should not rely on colour alone (already has tick — verify contrast of tick);
AW-3 (P2) rest-timer ring/controls legibility over content when scrolled (backdrop blur is
present ✓); AW-4 (P3) per-row aria-label like "Set 2 complete".

### 3.6 Library (`/library`)
Purpose 9 — search + three filter rows + instant results; "Plan" quick-add per row.
Wayfinding 8. Hierarchy 8 — thumbnails anchor scanning. Consistency 8 — chips pattern
reused three times (movement/body-part/equipment). Accessibility 6 — filter chips are
buttons ✓, but result rows are divs (G-1); three chip rows stack = tall header before
content on phones. Interaction 8 — Show-more paging works. Responsiveness 7 — chips wrap
into many rows when body part selected. Craft 7. Density 8. **Overall 7.6**

Issues: L-1 (P2) three stacked chip rows push first result ~150 px down — consider
collapsing equipment chips behind the body-part choice or horizontal scroll; L-2 (P1 via
G-1) row semantics; L-3 (P3) custom-exercise creation row competes with results — it is
correctly first but could be visually quieter.

### 3.7 Stats (`/stats`)
Purpose 8 — tiles answer frequency/streak/weight instantly; Progress overview answers the
five questions; deep charts one tap away. Wayfinding 7 — History back-link only in header;
section order logical. Hierarchy 8 — overview card before detail charts. Consistency 7 —
tiles/cards/chips mixed but coherent; semantic colours inline (S-5). Accessibility 6 —
charts are canvas/svg without text alternatives; BodyMap is visual-only (muscle names
listed beside it ✓ mitigates); momentum/improving lists use colour + % text (✓ numbers
present). Interaction 7 — segmented ranges, tap heatmap days. Responsiveness 7 — cols
collapse; charts resize. Craft 7. Density 7 — densest screen; progressive disclosure
mostly works (exercise picker). **Overall 7.3**

Issues: ST-1 (P2) canvas charts need accessible summaries (the improving/stalled lists
partially provide them — document mapping); ST-2 (P2) tile values use inline font-size
overrides; ST-3 (P3) AI-coach "Ask" button appears only when configured — discoverability
of the feature relies on Settings reading (acceptable, opt-in by design).

### 3.8 History (`/history`)
Purpose 8 — reverse-chronological workouts, tap for detail. Wayfinding **5** — reached
only via a header icon in Stats; back chevron returns to Stats; no tab of its own; users
may not know it exists (heuristic: recognition over recall — violated mildly).
Hierarchy 8. Consistency 8. Accessibility 6 (G-1 rows; empty state is bare "No workouts
yet." — no next action, violates §33). Responsiveness 8. Interaction 8. Craft 7. Density 9.
**Overall 7.0**

Issues: HI-1 (P2) empty state lacks guidance (§33); HI-2 (P3) consider surfacing History
entry point from Home streak card (it already opens calendarSheet — close); HI-3 (P3)
no date-range filter (density grows unbounded).

### 3.9 Settings (`/settings`)
Purpose 8 — everything configurable, well-sectioned (Profile, Sync & backup, Coach, AI
coach, Notifications, General, During workout, Appearance, Data, Tip). Wayfinding 8.
Hierarchy 7 — long page; sections scan well thanks to grouped lists; Profile section sits
below Account which is arguably more important for identity-first UX (minor ordering
question). Consistency 7 — new sections (Coach/AI) mix input styles (raw `.input`
textfields vs `TextField` primitive elsewhere). Accessibility 6 — textareas/inputs have
placeholders but some lack visible labels (AI endpoint fields rely on placeholder only —
violates form-audit rule "what is this?"); switches have titles ✓. Responsiveness 8.
Interaction 8 — selects open sheets ✓, switches immediate ✓. Craft 7. Density 7 — long
scroll; acceptable for settings. **Overall 7.2**

Issues: SE-1 (P2) AI-coach endpoint/model/key fields: add visible labels (§15); SE-2 (P2)
section order — consider Profile above Account since identity/goals drive the product now;
SE-3 (P3) measurements NumberField commit-on-blur is invisible behaviour — add hint text.

### 3.10 Admin (`/admin`)
Purpose 8 — operator tool: roster, invites, disable, live presence. Out of scope for the
consumer redesign; scores omitted from priority matrix except: A-1 (P3) same G-1 row
semantics.

### 3.11 Sheets & modals layer
Purpose 9 — consistent bottom-sheet system with drag-dismiss, history integration (Android
back), scrim. Wayfinding 8 — close buttons consistent. Hierarchy 8. Consistency 8.
Accessibility **5** — sheets lack `role="dialog"`/`aria-modal`/focus trap/Escape handling
(grep: no role="dialog" anywhere); focus is not moved into the sheet on open nor restored
on close. This is the biggest a11y gap in the product (systemic, affects ~20 surfaces).
Interaction 9 — swipe-to-dismiss with drag tracking is genuinely direct-manipulation
(`data-nodrag` opt-outs exist). Responsiveness 8 — desktop centred variant exists. Craft 8.
**Overall 7.6**

Issues: SH-1 (**P0→P1 justification**: no keyboard/screen-reader path into ~20 core flows
— but mouse/touch users unaffected, so severity lands at P1 under "critical = blocks task
for a class of users") — add dialog semantics + focus management to the shared sheet
component once, fixing every sheet at once; SH-2 (P2) scrim backdrop-filter without
reduced-transparency fallback (S-1 instance).

---

## 4. Heuristic violations summary (§46)

| Heuristic | Violations |
|---|---|
| Visibility of system status | Sync status only visible via Settings dirty-flag internals (offline pushes silently retry) — minor; workout status excellent |
| Match with real world | Good overall; "RIR/RPE" jargon is explained in-app ✓ |
| User control & freedom | Unlink/sign-out confirmations ✓; discard-workout guarded ✓; **sheet dialog semantics missing** (keyboard escape) |
| Consistency | Accent overload (S-4); inline-style drift (S-7); stale copy (S-10) |
| Error prevention | Destructive actions confirmed ✓; numeric inputs clamped ✓; restore merges instead of overwriting ✓ |
| Recognition over recall | History buried (HI-*); icon-only reorder controls (R-1) |
| Flexibility | 12 languages, themes, accents, units, effort scale off-by-default ✓ strong |
| Minimalist design | Workout screen exemplary; Stats borders on dense but uses disclosure ✓ |
| Error recovery | Offline sync failures silently retried with dirty flag — user-visible messaging could be clearer in Settings sync section (P3) |
| Help & documentation | No help/tutorial layer at all (Giwi docs N/A); tooltips sparse (P3) |

---

## 5. Priority matrix (consolidated)

**P0** — none found. (No blocker prevents any user class from completing a core task.)

**P1**
1. Sheet dialog semantics + focus management (SH-1) — one fix, system-wide effect.
2. Clickable-div lists without keyboard/focus semantics (G-1: Plan/Library/Admin/History/
   picker rows) — one shared `ListItem` primitive fixes all.
3. Reduced-motion blanket kill (S-3) → replace with opacity-preserving degradation.
4. Sub-44 px icon-only controls in RoutineEdit (R-1) and header actions in Workout (AW-1).
5. Missing `prefers-reduced-transparency` / `prefers-contrast` support (S-1, S-2) —
   two media-query blocks in one CSS file fix the whole product.

**P2**
Colour-token semantics (S-4/S-5), typography tracking scale (S-6), inline-style
consolidation (S-7, ongoing discipline), touch-target sweep (S-8 remainder), Library chip
stack height (L-1), History empty state (HI-1), AI-fields visible labels (SE-1), section
order review (SE-2), chart summaries (ST-1), stale copy (S-10/H-1).

**P3**
Dim-text contrast verification pass, History range filter, per-row aria-labels, quiet
custom-exercise row, measurement-blur hint, admin row semantics, error-copy pass for sync
failures, tooltips/help layer decision.

---

## 6. Scores table (consolidated)

| Screen | Purpose | Wayfind. | Hierarch. | Consist. | A11y | Resp. | Interact. | Craft | Density | **Overall** |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | 8 | 7 | 8 | 7 | 6 | 8 | 8 | 7 | 8 | **7.4** |
| Plan | 8 | 8 | 7 | 8 | 7 | 7 | 7 | 7 | 8 | **7.5** |
| RoutineEdit | 9 | 7 | 7 | 7 | 5 | 7 | 7 | 7 | 8 | **7.0** |
| Start chooser | 9 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 9 | **7.9** |
| Active workout | 9 | 8 | 8 | 7 | 6 | 8 | 8 | 7 | 9 | **7.8** |
| Library | 9 | 8 | 8 | 8 | 6 | 7 | 8 | 7 | 8 | **7.6** |
| Stats | 8 | 7 | 8 | 7 | 6 | 7 | 7 | 7 | 7 | **7.3** |
| History | 8 | 5 | 8 | 8 | 6 | 8 | 8 | 7 | 9 | **7.0** |
| Settings | 8 | 8 | 7 | 7 | 6 | 8 | 8 | 7 | 7 | **7.2** |
| Sheets layer | 9 | 8 | 8 | 8 | 5 | 8 | 9 | 8 | 8 | **7.6** |
| Admin | 8 | 7 | 7 | 7 | 5 | 7 | 6 | 6 | 7 | **6.8** |

Product average ≈ **7.4 / 10**. The base is genuinely good — the gap to a premium feel is
concentrated in accessibility semantics (dialog/list roles, focus), two missing media-query
families, colour-token semantics, and craft consistency (tracking/spacing/inline styles) —
not in structure or features.

---

## 7. Colour-system note (per the brief's request for "different colors")

Current identity: near-black surfaces (#000/#0e0e10/#1c1c1e) + green default accent
(#30d158) + iOS system palette. The surfaces and neutral ramp are strong and should stay.
What dates the product visually is the **default accent + the way accent green doubles as
every signal**.

Redesign direction (full palette in DESIGN-SYSTEM.md):
* Keep the neutral surface ramp (possibly +2 % warmth).
* Replace the default accent family: **ember orange** (`#ff7a1a` primary, `#c2410c` pressed)
  recommended — high energy, fitness-appropriate, distinct from Apple Fitness's green/rings,
  passes contrast with black on-accent text (≈ 8.6:1 for large/bold, ≥4.5:1 for UI text on
  dark), and reads differently from success-green so actions stop competing with status.
* Promote existing palette entries to semantic tokens: success=`--green`, warning=
  `--orange`… conflict: warning and ember accent would collide → recommendation keeps
  warning=`--yellow` and moves `--orange` out of general use OR picks **electric teal**
  (`#2dd4bf`, contrast ≈ 9:1 on black) as accent with amber reserved for warnings. Both
  options specified; final pick = implementation phase A/B behind the existing accent
  setting so user choice remains (agency principle).
