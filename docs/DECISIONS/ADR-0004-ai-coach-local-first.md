# ADR-0004 — AI Coach is opt-in, local-first, bring-your-own-provider

Date: 2026-08-22 · Status: Accepted · Phase: 9

## Context

The AI Coach phase must not compromise MiGym's core promise (your data stays yours) or its
guest/mobile modes, which have no account and no server.

## Decision

1. **Opt-in:** without a configured provider, no coach UI exists and nothing is sent anywhere.
2. **Local-first:** the pipeline User Data → Analytics → Deterministic Rules runs entirely
   on-device via pure modules; the model only receives a bounded digest of recorded facts
   and computed metrics.
3. **Bring your own provider:** OpenAI-compatible `/chat/completions` transport covers
   Ollama/LM Studio (fully local), OpenAI, Groq, OpenRouter etc. The user chooses; MiGym
   ships no key and no proxy.
4. **Credential hygiene:** provider config (incl. API key) lives in a dedicated localStorage
   key outside the synced state blob `S` — it never syncs, never appears in backups/exports,
   and is only placed in the Authorization header of the user's own request.
5. **Guardrails are code, not vibes:** the system prompt requires labelling answers as
   Recorded facts / Calculated / Recommendation / Uncertainty, forbids invention and medical
   claims, and subordinates the model to deterministic rule outputs (`suggestionsFromRules`).
6. **No new runtime dependencies** for the coach (plain fetch).

## Consequences

* Hosted "Pro" AI later means adding an optional server-side endpoint the user explicitly
  selects — the local path remains untouched (AGPL §13 obligations still apply to it).
* Answer quality depends on the user's chosen model; MiGym surfaces errors verbatim instead
  of hiding them behind retries.
