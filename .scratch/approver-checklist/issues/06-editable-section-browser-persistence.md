# 06: Editable section reads and writes the browser

**What to build:** The Approver checklist section beside the vote form stops talking to the server and lives entirely in the viewer's browser: it seeds from the browser key on mount, saves immediately on every tick or note change, syncs with other tabs, and needs no flush machinery because nothing is ever pending.

**Blocked by:** 05 — Browser storage adapter and state re-pointing

**Status:** resolved

- [x] On mount the section seeds from the viewer's browser state for that submission, so returning in the same browser prefills the ticks and note.
- [x] Every tick and every note change is written through immediately; there is no debounce, no pending write, and no saved/saving indicator anywhere in the section.
- [x] A change made in another tab is adopted per field via the storage event; a removal in another tab resets the section to empty; two tabs of the same submission in the same browser stay in sync.
- [x] Clearing every tick and the note removes the saved state entirely.
- [x] The section never accesses browser storage during server-side rendering.
- [x] The flush-before-vote machinery is removed; clicking Save Vote or navigating away can never lose checklist work, because the in-memory state is already persisted.
- [x] The section still renders the shared rule groups (porting group only when the submission is a port), keeps the note at the bottom, and keeps its placement beside the vote form — unchanged surfaces stay unchanged.
- [x] Full suite green; typecheck, lint, and build clean; live browser verification: tick + note, reload → prefilled; two tabs stay in sync; clear-all → nothing saved.

## Comments

Implemented and verified 2026-08-30:

- **Section rewired to the browser** (`components/review/ApproverChecklistSection.vue`): the store is bound client-side only (`onMounted`) to the per-viewer key `approver-checklist:{userId}:{submissionId}`, seeded from `store.read()` (returning in the same browser prefills); every tick and note change writes through immediately through a deep `watch` — no debounce, no pending write, no saved/saving/loading indicator anywhere; a `storage`-event listener adopts another tab's changes per field via `approverChecklistDeltaFromEvent` (a key removal resets the section to empty); a fully cleared state removes the key via the storage module's clear-to-remove. The checklist starts seeded-empty at setup so `checklist[group.key]![i]` is defined before the mount seed (caught in live verification: `undefined[0]` render errors without it). A `user-id` prop (the page's session user id) composes the key; a (userId, submissionId) watcher re-seeds on in-place route navigation. Unchanged surfaces: same rule groups (porting only for ports), note at the bottom, placement beside the vote form.
- **Flush machinery removed**: `flush()`/`defineExpose`/debounce/`saveState`/unmount-flush and the saved/saving indicators are gone from the section; the page drops `checklistRef` and `flushChecklistBeforeVote`; `ApproverVoteForm` drops its `beforeSave` prop and the pre-vote flush — nothing is ever pending, so Save Vote and navigation can never lose checklist work.
- **Verification**: full suite 244 green (storage 34 + state 20 tests cover the whole browser-storage/state surface unchanged); typecheck, lint (0 errors), and build clean. Live browser session (approver account): tick + note → reload prefills; two tabs of the same submission stay in sync in both directions via the storage event; clear-all removes the key and reloads empty; non-port submission renders no Porting group, port submission renders it; no Saving/Saved text anywhere.
- **Review (code-review skill)**: both axes OK with notes — the one actionable finding (an orphaned doc comment left above `readonlyChecklistVisible` in the page) was fixed; the remaining notes are the pre-accepted markdown-render duplication and the report-only mount-time no-op re-save / stale-porting-key edge, both harmless.