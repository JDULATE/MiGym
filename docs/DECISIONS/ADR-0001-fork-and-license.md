# ADR-0001 — MiGym forks openGym under AGPL-3.0-or-later

Date: 2026-08-21 · Status: Accepted

## Context

MiGym starts from openGym (https://gitea.com/DuarteSantos/openGym, commit `4b25a80`, v1.2.7+),
a mature self-hosted fitness tracker. The repository is licensed AGPL-3.0-or-later with an
app-store additional permission (§7) documented in NOTICE.md.

## Decision

1. MiGym is a derivative work of openGym and distributes under **AGPL-3.0-or-later**.
2. Upstream copyright notices, LICENSE and NOTICE.md are preserved verbatim.
3. All future hosted offerings (Cloud/Pro/Coach/Gyms) must satisfy AGPL §13: users interacting
   with a modified version over a network must be offered its corresponding source.
4. Any architecture that cannot live with §13 (e.g. closed-source server components combined
   into a covered work) is out of scope unless separately licensed components are used that do
   not form a combined work — each such plan gets its own ADR before implementation.

## Consequences

* The open-core business model must monetize services/operations, not closed forks.
* Every release states its modifications (CHANGELOG); hosted deployments expose their source
  (mechanism decided in Phase 10/13 design).
* App-store distribution requires confirming the inherited §7 permission's scope for MiGym
  branding with upstream, or issuing our own permission as copyright holder of additions.
