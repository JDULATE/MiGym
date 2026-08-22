# MiGym Cloud — Security-Copy Service Design

Status: **design** (ADR-0006 governs the sync semantics; no server code written yet).
Phase 10 deliverable. The Community edition stays fully functional with or without this.

## 1. Product shape

MiGym Cloud is **not a mode** — it is a hosted place to keep the security copy that the
optional server link (ADR-0005) already provides on self-hosted instances:

| | Self-hosted link | MiGym Cloud link |
|---|---|---|
| Software | this repo's `api/`, unchanged | this repo's `api/` + multi-user hardening below |
| Who runs it | you | MiGym |
| Purpose | sync across your devices | same + device-change restore, managed backups |
| Account | passkey profile you create on your instance | passkey profile on the cloud instance |
| Data visible to operator | you are the operator | encrypted-at-rest snapshots (see §5); minimal operational metadata |

The client gains exactly one new concept: **a chosen backup endpoint** (self-hosted URL or
the cloud URL). Everything else — linking, push/pull, unlink-keeps-local — already shipped
in Phase 10 part 1.

## 2. Server-side requirements (delta over today's `api/server.js`)

1. **Snapshot retention**: store per user not just `state-<uid>.json` but the last
   `SNAPSHOT_KEEP = 10` pushed snapshots (`snapshots/<uid>/<ts>.json`) plus `current`.
   Restore = list snapshots → pick → fetch. Retention bounds storage per user (~1–3 MB each).
2. **Multi-user hardening for shared hosting** (today's trust model assumes family):
   rate limiting at the edge (documented reverse-proxy recipe becomes mandatory in cloud),
   per-user disk quotas, admin tooling unchanged.
3. **Backups of the backups**: nightly server-side dump to object storage; restore drill
   documented.
4. **AGPL §13 compliance**: the cloud runs this public repository; the exact running
   version is published (git tag + build info endpoint `/api/version`).

## 3. Client flow (new device / lost device)

```
New device → local base starts empty (local-first still applies)
           → Settings ▸ Sync & backup ▸ Link to an existing profile
           → passkey sign-in against the chosen endpoint
           → client detects empty local base + non-empty remote:
                 "Restore security copy? (dates: 2026-08-22, …)"
           → user picks snapshot → GET → merge-in per ADR-0006 rules
           → device now has the base locally; normal bidirectional sync resumes
```

Rules carried over from ADR-0005: an unreachable endpoint never blocks entry; unlink keeps
the local base; restore never deletes local-only workouts (union by id, §ADR-0006).

## 4. Sync protocol v2 summary (full rules in ADR-0006)

* Transport stays `GET/PUT /api/data` during Stage 1; the payload gains
  `{ state, baseTs }` where `baseTs` is the `_ts` the client last received from THIS
  endpoint (stored per endpoint in localStorage).
* Server stores the previous accepted blob as a snapshot before overwriting → any LWW
  mistake is one click away from recovery even before Stage 2 field-merge lands.
* Client keeps a per-endpoint dirty flag (already exists as `gym_dirty`) so offline work
  is preserved and re-pushed after restore.

## 5. Privacy

* Snapshots at rest: AES-GCM envelope encryption with a key derived from a
  user-generated **Recovery Secret** (shown once at link time, printable). The operator
  then holds ciphertext; account loss without the secret means data loss — stated plainly,
  never hidden behind marketing.
  *Stage 1 may ship read-able snapshots with encryption flagged as the upgrade path if
  implementation risk demands it — decision recorded here when made.*
* Telemetry: none (unchanged).

## 6. Non-goals for the cloud service

* No social features, no coach marketplace, no analytics on user data.
* No AI proxying through cloud servers (coach stays BYO-provider per ADR-0004).

## 7. Implementation order (each gated on review)

1. Snapshot retention + version endpoint in `api/` (works on self-hosted too).
2. Client restore flow (list/fetch/merge).
3. Optional Recovery-Secret encryption layer.
4. Managed-hosting runbook (docs/DEPLOYMENT.md extension): provisioning, quotas,
   monitoring, §13 source publication.
