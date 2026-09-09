# 03: Record the purge and the re-tune in the glossary and an ADR

**What to build:** Capture the decisions this effort settles in the project's persistent documentation so future readers and agents understand why the review side has no finalized reasoning and why the export still emits one placeholder. The glossary is updated to reflect the post-purge reality: a Filter note exists only on proposed Course filters — a Finalized filter never carries one — and the Final reference badge (the decided view's `Final:` marker per field) is glossed. One ADR (the next free number) records the full arc: the Finalized-filter notes field was un-writable from its introduction (the lead decision form always sent null), the decided view consequently rendered a permanent placeholder on the Reasoning row, the review-side surface was purged, and the export placeholder is deliberately retained to keep the external dashboard's import contract byte-identical (ADR-0008). The ADR also records the rejected alternative of keeping the field for a future lead reasoning input, and why it was declined.

**Blocked by:** 02 (the ADR must describe the post-purge reality)

**Status:** ready-for-agent

- [ ] The glossary defines the Filter note as proposal-only — attached to a proposed Course filter, never carried by a Finalized filter — and notes that a Finalized filter carries no reasoning; no implementation details enter the glossary.
- [ ] The glossary glosses the "Final reference badge": the decided view's per-field `Final:` marker showing a Finalized filter's settled value.
- [ ] The new ADR records the field's un-writable history, the purge rationale, the deliberately preserved export placeholder, and the rejected alternative (keeping the field for future lead reasoning input); it sits in the next free ADR slot and references the export-contract ADR.
- [ ] The ADR and glossary entries agree with the shipped code from tickets 01 and 02 — no contradictory terms, no leftover "proposed or finalized" language.
- [ ] `pnpm lint && pnpm typecheck` pass (no code changes expected, only docs, but the suite must stay green).