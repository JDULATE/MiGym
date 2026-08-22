# MiGym — Roadmap

Sequential phases. **Never start a phase without explicit authorization, and never mix
phases.** Each phase ends with: tests green, build green, docs updated, `context.md` updated,
diff reviewed, and a stop-report before the next phase begins.

Baseline: openGym v1.2.7+ (`4b25a80`), AGPL-3.0-or-later. Audit date 2026-08-21.

## Phase 0 — Repository audit ✅ (complete)

Understood the inherited codebase; produced ARCHITECTURE.md, docs/DATA_MODEL.md,
docs/LICENSING.md, this roadmap and context.md. Verified baseline: 326/326 frontend tests,
36/36 MCP tests, production build OK (Node 22 semantics; see known Node-26 caveat in
context.md).

## Phase 1 — MiGym Foundation

Rename/brand to MiGym without touching workout logic.

* App name/title in `frontend/index.html`, `public/manifest.json`, `capacitor.config.json`,
  Android `strings.xml`/app id, PWA service-worker notification strings.
* `RP_NAME` default in `api/server.js` + `.env.example`, Docker labels, compose project name.
* Logo/favicon/icon assets (icon-180.png, icon-512.png, Capacitor splash set).
* Navigation labels / locale strings: add MiGym keys to all 12 locale packs (keep checker green).
* Design tokens: codify the existing CSS custom-property system in `src/index.css`
  (typography scale, spacing, touch-target minimums) — document, don't redesign.
* Keep upstream copyright/license notices intact (AGPL).

Acceptance: app launches, 326 tests pass, build passes, PWA installs, auth + workout flow work.

## Phase 2 — Fitness profile ✅ (complete)

`S.profile = { name, image, goal, experience, daysPerWeek, sessionMinutes, equipment[],
preferences, heightCm }` plus append-only `S.measurements[]` — implemented in
`lib/profile.js` with normalisation + tests, UI in Settings (Profile & Body sections),
translated in all packs. No medical claims anywhere; data shaped for future consumers.
See docs/DATA_MODEL.md.

## Phase 3 — Workout system polish ✅ (complete, 2026-08-22)

Audit vs the MiGym spec found nearly everything already present in inherited functionality:
previous-performance line ("Last time"), per-set RIR/RPE recording, rest timer + push
fallback, warm-up handling, supersets, PR detection at completion, finish flow. The one gap
— **per-exercise notes** — is now implemented: `entry.note` on session entries (seeded from
`cfg.note` on routine entries, mirrored back to the routine on save, preserved through
finish). Target-RIR prescription is deferred to Phase 4/8: recording effort exists;
prescribing it belongs to the progression engine.

## Phase 4 — Progression engine isolation ✅ (complete, 2026-08-22)

`frontend/src/lib/engine/` public API barrel (progression / strength / effort / fatigue /
deload / volume) with new warmup-aware pure volume module and multi-session trajectory
tests. Behavior-preserving: bodies remain in `lib/*.js` so views and the MCP server keep
stable paths; future code consumes only the engine barrel. Public API in docs/API.md.

## Phase 5 — Analytics ✅ (complete, 2026-08-22)

`lib/analytics.js` (trainingSummary + exerciseMomentum, explicit thresholds) and a
"Progress overview" card in Stats: 7-day / 8-week-average volume, Ø session length,
PRs · 30 d, plus Improving/Stalled lists with reasons. Questions already covered by
inherited views (muscle map, heatmap/streak, per-exercise charts) are not duplicated.

## Phase 6 — Exercise library ✅ (complete, 2026-08-22)

Derived taxonomy in `lib/exercise-taxonomy.js`: movement groups (push/pull/legs/core/
cardio; 1,322/1,324 placed), equipment-class type tags, documented difficulty heuristic
with an empty curated-override extension point, and ranked alternatives on the detail
sheet. Library gains movement-group chips. Compound-vs-isolation intentionally not derived;
no new dataset content authored (licensing boundary).

## Phase 7 — Routine builder ✅ (complete, 2026-08-22)

Target RIR per exercise (stored, shown in-session; engine enforcement deferred to Phase 8),
per-exercise rest override honored by the session flow (supersets included), starter
template picker (PPL / Upper-Lower / Full Body) with validity tests. Additive only:
configs without the new fields serialize exactly as before. Ordering/supersets/notes were
already present from earlier phases/upstream.

## Phase 8 — Adaptive training ✅ (complete, 2026-08-22)

`lib/adaptive.js`: deterministic, explainable suggestions (increase / ease / review /
adherence) layered on the engine and the Phase-7 RIR targets; rendered as *Adjustments*
in the Stats progress-overview card. Read-only over history, nothing auto-applied,
thresholds are named constants. AI remains excluded from these rules (Phase 9 builds on
top of them).

## Phase 9 — AI Coach ✅ (complete, 2026-08-22)

Opt-in, local-first, bring-your-own-provider (ADR-0004): bounded facts/computed context +
guardrailed system prompt + OpenAI-compatible transport via plain fetch. Settings provider
card (credentials outside S — never synced/backed up), "Ask" chat sheet in Stats. Works in
guest and mobile builds; without a configured endpoint the coach does not exist. The
deterministic adaptive rules stay authoritative; the model explains, never overrides.

## Phase 10 — Cloud architecture ✅ (core complete, 2026-08-22)

**Shipped:** local-first single mode (ADR-0005); union-first sync merge + per-section
timestamps (`S._mts`, Stage 1b) + workout deletion tombstones (`S._tomb`, Stage 2)
(`lib/sync.js`, 17 tests); server snapshots (keep 10) with list/fetch endpoints and a
Settings restore flow; CLOUD_DESIGN.md for the managed security-copy service.

**Optional leftovers:** Recovery-Secret encryption at rest, managed-hosting runbook.
Community edition remains fully independent.

## Phase 11 — Coach platform ✅ (complete, 2026-08-22)

ADR-0007: roles (`COACH_UIDS` env), pairing-code links with client-chosen scopes
(summary/full) enforced server-side before serialization, unilateral revocation, two-way
visible notes. Coach roster + client review sheet in Settings. First API integration
suite (node --test, temp DATA_DIR, minted cookies) covering the consent lifecycle and
authorization negatives. Routine assignment deferred to Phase 12.

## Phase 12 — Gym platform ⏸ deferred ("coming soon")

Multi-tenant B2B. Parked by product decision; announced on the website as coming soon.
Requires a multi-tenant isolation design doc (ADR) before any implementation.

## Phase 13 — Commercial services ⏸ deferred ("coming soon")

Managed cloud / Pro tiers parked; the security-copy service design already exists
(docs/CLOUD_DESIGN.md). Any paid offering must resolve AGPL §13 architecture first
(ADR required). Open-source core stays complete and free.

## Phase 14 — Deployment hardening ✅ (complete, 2026-08-22)

docs/DEPLOYMENT.md rewritten as a full production guide (env reference, HTTPS + rate
limiting examples for Caddy/nginx, backup/restore incl. a drill, monitoring, log rotation
via compose override, update/rollback procedure, pre-launch security checklist);
scripts/backup.sh + scripts/restore.sh added (archives ./data including sync snapshots);
website announces phases 12–13 as coming soon.
