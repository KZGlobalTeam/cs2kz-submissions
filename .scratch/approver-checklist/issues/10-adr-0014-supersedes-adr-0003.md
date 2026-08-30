# 10: ADR-0014 supersedes ADR-0003

**What to build:** The decision is recorded for future readers: the old storage decision is marked superseded and a new ADR documents why the Approver checklist and note live in the viewer's browser, the alternatives considered, and the accepted consequences.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] ADR-0003 carries a clear superseded banner referencing the new ADR.
- [x] The new ADR records the decision — browser-local storage behind an injectable adapter, per-account keying, write-through saves with cross-tab sync — in the repo's ADR format.
- [x] It records the alternatives considered (keep the per-approver table, dual-write) and why the browser was chosen.
- [x] It records the accepted consequences: per-browser persistence only, loss modes (cache clear, private browsing, other devices/browsers), shared-browser keying, and cross-tab semantics.
- [x] It uses the canonical glossary terms (Approver checklist, Approver note), contains no file paths or code snippets, and stays consistent with the re-scoped feature spec.
## Comments

Implemented 2026-08-30:

- **ADR-0003 superseded**: `docs/adr/0003-approver-checklist-private-storage.md` carries a blockquote banner directly under the H1 stating it is superseded by ADR-0014 and why, with the historical record preserved below it.
- **ADR-0014 written**: `docs/adr/0014-approver-checklist-browser-storage.md`, in the repo's house format (flowing prose with `Considered:` and `Consequences accepted:` markers, title starting with "The …"). It records the browser-local decision (injectable storage adapter, per-account keys from the session user id, write-through saves, per-field cross-tab adoption with newer-write-wins, clear-to-delete semantics, graceful degradation) and the alternatives (keep the per-approver table, dual-write) with their rejections.
- **Glossary and scope kept**: uses the canonical terms Approver checklist and Approver note throughout (never "rule check-off", "verification log", or bare "note" as the concept); contains no file paths or code snippets; stays consistent with the re-scoped spec (per-browser loss modes, shared-browser keying threat model, per-index tick staleness, orphaned keys, storage-unavailable degradation).
- Ticket 11 (ADR-0009 amendment) becomes unblocked by this resolution.