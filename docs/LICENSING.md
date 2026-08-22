# Licensing

Status: verified against the repository at fork time (openGym `4b25a80`, 2026-08-21).
**This document is informational, not legal advice.**

## The original project's license

The entire openGym codebase is licensed **GNU Affero General Public License v3.0-or-later**
(`LICENSE`, and `"license": "AGPL-3.0-or-later"` declared in `frontend/package.json`,
`api/package.json`, `mcp/package.json`). Upstream copyright: **Copyright (C) 2026 Duarte
Santos** (see `NOTICE.md`).

Consequences that bind MiGym:

* MiGym is a derivative work; it must be distributed under AGPL-3.0-or-later with preserved
  copyright and license notices.
* **AGPL §13 (Remote Network Interaction):** anyone who modifies the program *and lets users
  interact with it over a network* must offer those users the corresponding source of the
  version they are running. This applies directly to every future hosted offering
  (MiGym Cloud / Pro / Coach / Gyms): running a modified/extended version as a service
  creates a source-disclosure obligation to that service's users.
* Proprietary code cannot be combined into a single covered work with this codebase.
  Separate, independently-shippable add-ons ("mere aggregation", GPLv3 §13 note /
  AGPL scope) or separately licensed components from their own authors are the only paths —
  each future commercial architecture must be reviewed against this constraint and documented
  in `docs/DECISIONS/` rather than worked around silently.

## App-store exception (inherited)

`NOTICE.md` grants — as an additional permission under AGPL §7 by the upstream copyright
holder — distribution of the mobile application through app stores whose terms would
otherwise conflict with the AGPL, provided source remains available under the AGPL at the
project repository. **Scope note for MiGym:** that permission text names openGym. Before any
MiGym store listing, the permission must be confirmed/extended with the upstream copyright
holder, or MiGym must rely on its own §7 permission grant as copyright holder of its additions.

## Third-party components discovered

| Component | Where | License | Obligations |
|---|---|---|---|
| openGym code (frontend, api, mcp, web, scripts, website) | whole repo | AGPL-3.0-or-later | keep notices; share source incl. network use |
| Exercise dataset: names, instructions (`frontend/src/lib/exercises-data.js`, `src/instr/`), images/GIFs (fetched at deploy into `media/`) | [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) | **its own terms — NOT AGPL** | media not committed here; review upstream license before redistributing bundled media; regenerated via `scripts/build-instructions.mjs` |
| Muscle body-map path data (`frontend/src/lib/body-paths.js`) | derived from [MuscleMap](https://github.com/melihcolpan/MuscleMap) by Melih Colpan | MIT (full notice in NOTICE.md) | preserve MIT copyright + permission notice |
| npm runtime deps — frontend: react, react-dom (MIT), react-router-dom (MIT), zustand (MIT), @capacitor/* (MIT) | frontend/package.json | MIT | standard MIT notices in redistribution builds |
| npm runtime deps — api: @simplewebauthn/server (MIT), web-push (MIT, uses node-jose etc.) | api/package.json | MIT | none beyond notices |
| npm deps — mcp: @modelcontextprotocol/sdk (MIT), zod (MIT) | mcp/package.json | MIT | none beyond notices |

Dependency licenses were checked at audit time from the packages' declared licenses (all MIT);
a full `license-checker` pass should be added when new dependencies are introduced
(see docs/DECISIONS ADR-0003).

## What MiGym inherits vs develops

* **Inherited (AGPL-3.0-or-later, © Duarte Santos + contributors):** everything present at
  commit `4b25a80` — frontend, api, web, mcp, website, docs, CI.
* **Newly developed (MiGym project, AGPL-3.0-or-later unless decided otherwise in
  `docs/DECISIONS/`):** all subsequent changes: branding, profile, engine isolation,
  analytics, library enrichment, builder, adaptive layer, AI coach integration, cloud,
  coach/gym features, deployment hardening.

## Distribution obligations checklist (future releases)

1. Keep `LICENSE` (AGPL-3.0) and `NOTICE.md` intact, with upstream copyright preserved.
2. State modifications prominently (AGPL §5a) — CHANGELOG entries per release.
3. For any hosted offering, provide users access to the complete corresponding source of the
   running version (AGPL §13), including build/deploy instructions equivalent to Docker Compose.
4. Do not bundle exercise media without reviewing the upstream dataset terms.
5. Keep the MIT notice for body-paths.js wherever that file ships.
6. Re-run dependency license review whenever dependencies change.

Open issue to track: confirm app-store exception scope for MiGym branding before Phase 12+.
