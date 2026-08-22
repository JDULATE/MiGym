# ADR-0003 — Dependency policy

Date: 2026-08-21 · Status: Accepted

## Policy

Before adding any dependency (runtime **or** dev):

1. Existing code or platform APIs cannot solve it.
2. The dependency is actively maintained and necessary.
3. License compatibility verified (MIT/Apache/BSD fine; GPL-incompatible licenses rejected;
   record result in docs/LICENSING.md).
4. Bundle/runtime impact measured and acceptable (frontend main chunk already ~1.5 MB).
5. Justification recorded in the PR/commit introducing it and in CHANGELOG.

## Current baseline (audit result)

* Frontend runtime: react, react-dom, react-router-dom, zustand (+ @capacitor/* in mobile
  builds). Dev: vite, vitest, happy-dom, linkedom, capacitor toolchain.
* API runtime: @simplewebauthn/server, web-push. MCP: @modelcontextprotocol/sdk, zod.
* All MIT at audit time.

## Known upcoming needs (candidates, not commitments)

* ESLint (+ plugins) as dev dependency in Phase 1 — repo has zero linting today.
* No AI SDK until Phase 9 design; no billing SDK ever before Phase 13 decision.
