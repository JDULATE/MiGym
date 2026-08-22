# ADR-0002 — Keep the inherited architecture

Date: 2026-08-21 · Status: Accepted

## Context

MiGym's mandate forbids speculative architecture (microservices, Kubernetes, Redis, GraphQL,
event sourcing…) and rewrites. The audit found the inherited stack small, coherent and tested.

## Decision

Keep, for the foreseeable future:

* React 19 + Vite + Zustand + HashRouter SPA; pure-logic modules under `frontend/src/lib/`.
* Single-file framework-less Node API with JSON-file storage under `./data`.
* nginx same-origin proxy deployment via Docker Compose.
* Vitest colocated tests as the testing substrate.

MiGym work happens by **extension**: new pure modules (progression engine, analytics),
new state fields, new API routes in the existing table — not by restructuring.

## Consequences

* JSON storage and whole-state LWW sync are accepted limitations until Phase 10 explicitly
  redesigns sync (with its own ADR).
* No TypeScript migration is planned; logic stays plain ES modules with tests as the safety net.
* Any deviation from this ADR requires a new ADR documenting why.
