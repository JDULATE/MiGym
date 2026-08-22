# ADR-0005 — Local-first is the only mode; cloud is an optional backup target

Date: 2026-08-22 · Status: Accepted · Phase: 10 (re-scope) · Supersedes the guest-mode model

## Context

MiGym shipped with a two-mode entry (passkey account **or** guest). Product direction
change: local-only should be THE mode — no login gate, no "guest" label, no second class of
user. Cloud exists solely as an optional place to keep a security copy so a new device can
pick up where the old one left off.

## Decision

1. **The app boots straight into your data. Always.** No login screen; the tab bar and all
   features are available from first run, offline or air-gapped.
2. **Guest mode is removed** as a concept. There are no "guests" — there are users whose
   base lives on their device. The legacy `gym_guest` flag is dropped on boot.
3. **Server profiles become an optional link**: passkey registration/login is reused as
   "link this device to a synced copy". Linking adds sync + backup; unlinking keeps every
   byte of local data (a final push runs first when possible).
4. **Cloud (Phase 10+) = storage for those security copies** — never a requirement, never a
   feature gate, never the only copy unless the user deletes their local one.
5. `ALLOW_GUEST` loses its meaning on MiGym instances (kept server-side for upstream
   compatibility; ignored by the client).

## Consequences

* The old "sign out wipes this device's data" behavior is gone — unlinking preserves the
  base (tested in useStore.test.js).
* Multi-person instances still work via separate linked profiles; per-device local bases
  remain private by default.
* Cloud phase design must treat the device copy as authoritative-first (device wins on
  conflict unless the user chooses restore), replacing whole-state LWW assumptions.
