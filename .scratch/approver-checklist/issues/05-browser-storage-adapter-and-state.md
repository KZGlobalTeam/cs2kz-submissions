# 05: Browser storage adapter and state re-pointing

**What to build:** The building block that lets the Approver checklist and note live entirely in the viewer's browser: a thin storage module over an injectable Storage backend (defaulting to `window.localStorage`) that owns key composition, serialization, immediate saves, clearing, cross-tab change deltas, and safe failure — plus the pure state layer re-seeded from parsed browser values instead of a server row. Nothing else changes yet; the app keeps working against the old API until the rewiring tickets land.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The storage module composes a deterministic per-viewer key from the session user id and the submission id, so two accounts on the same browser never share state.
- [x] Saving the full ticks/note state persists it immediately (write-through), and reading it back round-trips exactly; the payload shape matches the section's `{ <groupKey>: boolean[] }` plus a ≤2000-char, trimmed, empty-normalized note.
- [x] An absent key reads as an empty state; a fully cleared state (every tick off, note empty) removes the key.
- [x] Corrupt or foreign JSON under the key reads as a resilient empty state, never a crash.
- [x] Cross-tab deltas are derived per field from a storage event — including key removal resetting to an empty state — independent of any DOM.
- [x] Storage read/write failures (storage disabled, quota) are caught and degrade to in-memory behavior without throwing into the caller.
- [x] The pure state layer (visible groups, seed-from-saved normalization, payload/note normalization, `hasSavedContent`) consumes parsed browser values; its observable behavior is unchanged from the server-backed version.
- [x] All behavior is covered on the repo's pure-function seam (node vitest, dependency-free modules) using an in-memory Storage fake — key composition, round-trip, clear-to-remove, resilient-parse, cross-tab deltas, and degradation.
- [x] Full suite green; typecheck, lint, and build clean.
## Comments

Implemented and verified 2026-08-30:

- Storage module: `components/review/approver-checklist-storage.ts` — new dependency-free module owning the whole browser-storage surface: deterministic per-viewer key `approver-checklist:{userId}:{submissionId}`, write-through save/read round-trip (`{ <groupKey>: boolean[] }` + ≤2000-char trimmed, empty-normalized note — stored notes clamp at the storage boundary), clear-to-remove, resilient parse (absent key, corrupt/foreign JSON → fresh empty state), per-field `storage`-event deltas (removal resets changed fields; other keys ignored) independent of any DOM, and session-scoped in-memory degradation when the backend fails. The `Storage`-shaped backend is injectable and defaults lazily to `window.localStorage` (null where no window exists, e.g. SSR/node), so the module is importable everywhere and never touches the DOM at import time.
- State layer: `components/review/approver-checklist-state.ts` re-pointed — `buildChecklistPayload` now returns the parsed browser value (`ApproverChecklistState`, imported from the storage module) instead of a server-row payload; the four pure functions (visible groups, seed-from-saved, payload/note normalization, `hasSavedContent`) consume parsed browser values with observable behavior unchanged. No component, server API, schema, or shared-types change in this ticket — the app keeps working against the old API until the rewiring tickets (06/07) land.
- Tests: `tests/server/utils/approver-checklist-storage.spec.ts` (34 tests) with an in-memory `FakeStorage` over the minimal backend surface (throwable per-op for the degradation paths, mirroring the review-queue fake precedent); `tests/server/utils/approver-checklist-state.spec.ts` adapted (20 tests, same behavior surface). Full suite 244 green; typecheck, lint, and build clean.
