# Approver Checklist and Note

Status: `ready-for-agent`

## Problem Statement

When an approver reviews a submission, they have no way to keep a private record of which submission rules they have verified, and no place to jot observations for themselves while reviewing. The only rule listing in the product is the modal a mapper clicks through before creating a submission — it belongs to the submission flow, not the review flow, and nothing an approver does with it is saved or shown anywhere. An approver who wants to check "have I confirmed the jumpstat requirements?" or "did I note anything odd about course 3?" must hold that state in their head or in a tab outside the app. Reviews often span sessions — a map is inspected on the workshop, revisited, then voted on — so in-session scratch work is easily lost. Any such checklist must also stay private: approver votes are shared among reviewers, and nothing approver-internal may leak to other approvers or to the submitting mapper.

The first version of this feature stored each approver's private checklist in a dedicated per-approver database table, served by its own endpoints (ADR-0003). That works, but it puts scratchpad data on the server where it does not need to be: the checklist is a purely personal working aid, nobody other than its author may ever see it, and it is explicitly not a review artifact. Keeping it in the database funds a whole server surface — a table, two endpoints, a role predicate, a body schema, and their tests — purely to hold data that should never leave the author's browser. The re-scope replaces that surface with browser storage: the same section, the same auto-save, the same read-only-after-review surfacing, nothing ever sent to the server.

## Solution

An approver gets a checklist section next to the vote form. It shows the same groups of rules the mapper acknowledges before submitting — naming, courses, ranked, jumpstat, porting, other — all at once on one page, split into collapsible groups. The porting group appears only when the submission is a port. Each rule has its own checkbox the approver may freely check and uncheck, and a free-text note sits at the bottom of the section. Everything is saved immediately as the approver works — every change is written synchronously to the viewer's own browser storage — so ticks and the note survive closing and reopening the submission across sessions *in the same browser*, without forcing a vote; the saved state prefills the section when the approver returns. When the submission has left review, the section remains visible read-only — but hidden entirely if the approver never saved anything. The checklist and note are private to the one approver who wrote them by construction: they never leave that approver's browser, are keyed to their account even when another review account uses the same browser, and are never shown to other approvers, the lead approver, or the submitting mapper. There is no server-side storage, no API, and no role gate for the data itself — the only server involvement left is deciding whether the section renders at all (whether the viewer holds the `approver` role), from the session the server already authenticates.

The rule text is defined exactly once and shared with the pre-submission dialog, so editing a rule updates both surfaces. The checklist is purely advisory: it never gates or influences the vote and appears in no vote summary.

## User Stories

1. As an approver voting on a pending submission, I want a checklist section next to the vote form, so that I can verify the submission rules without leaving my vote context.
2. As an approver, I want the checklist to show the same rules the mapper acknowledges before submitting, so that both sides judge the map against exactly the same requirements.
3. As an approver, I want the rules split into the same groups as the pre-submission dialog (naming, courses, ranked, jumpstat, porting, other), so that I can work through each requirement area in the structure I already know.
4. As an approver, I want all groups shown on one page at once, so that I never have to click through a stepper to see the whole rule set.
5. As an approver, I want each group collapsible with all groups expanded by default, so that long groups don't turn the section into a wall of text while every rule stays reachable.
6. As an approver, I want the porting group present only when the submission is a port, so that port rules are only judged for submissions they actually apply to.
7. As an approver, I want to check and uncheck every rule independently and freely, so that I can record exactly which requirements I have verified.
8. As an approver, I want my ticks saved as I go without a save button, so that I don't lose verification work when I navigate away.
9. As an approver, I want my ticks and note to survive closing and reopening the submission across sessions in the same browser, so that multi-session reviews don't restart from scratch.
10. As an approver, I want my saved ticks and note to prefill the section when I return in the same browser, so that I can continue where I left off.
11. As an approver, I want a free-text note at the bottom of the section, so that I can record private observations while reviewing.
12. As an approver, I want the note saved with the same immediate save as my ticks, so that notes persist exactly like ticks.
13. As an approver, I want my note and ticks not to be lost when I click Save Vote and navigate away, so that saving the vote never costs me unpersisted checklist work.
14. As an approver, I want the section to be purely advisory, so that I can vote Yes even if I haven't personally re-verified every rule.
15. As an approver, I want my checklist and note never to be sent to the server, so that nothing about my private scratchpad leaves my browser.
16. As an approver, I want my checklist and note visible only to me, so that my working notes never influence other reviewers or the submitting mapper.
17. As an approver, I want another account reviewing on the same browser or device never to see my checklist, so that my ticks and note stay mine even when the machine is shared.
18. As an approver viewing a submission that has left review, I want my checklist and note still visible read-only in the same browser, so that I can reference what I verified after the fact.
19. As an approver, I want the read-only checklist hidden entirely when I never saved anything, so that finished submissions never show empty boxes.
20. As an approver, I want the read-only view to be non-editable, so that finalized review artifacts stay exactly as they were.
21. As an approver who also holds the `lead_approver` role, I still want to see my own checklist section and note, so that my additional role never hides my private verification record.
22. As a user who holds only `lead_approver`, I want to never see the checklist section or its content anywhere, so that my approval decisions rest on votes and map facts, not approvers' private scratchpads.
23. As a submitting mapper, I want to never see any approver's checklist or note, so that review stays internal.
24. As an approver, I want my ticks and note to stay synchronized across tabs of the same submission in the same browser, so that a change made in one tab is never silently lost by another.
25. As an approver using a browser where storage is unavailable or disabled, I still want the checklist usable within my current session, so that storage failures never block reviewing.
26. As a developer, I want the rule text defined once and shared by both the pre-submission dialog and the approver checklist, so that editing a rule updates both surfaces.
27. As a developer, I want saved ticks keyed by rule group and index, so that a rule-text change is reflected on both surfaces without any data migration.
28. As a developer, I want the storage key to include the viewer's account id, so that separate approvers' state can never collide or leak even in a shared browser.
29. As an approver, I want clearing every tick and the note to remove my saved state entirely, so that a submission I leave blank shows no empty boxes after review.
30. As an approver, I want the section laid out beside the vote form on desktop and stacked on mobile, so that I can work both surfaces without horizontal scrolling.
31. As a developer, I want the maintained server surface for this feature to be exactly zero, so that there is no table, no API, and no server tests left to keep in sync.

## Implementation Decisions

- **Storage — browser localStorage behind an injectable adapter** (per ADR-0014, which supersedes ADR-0003): the section state lives in the viewer's browser, never on the server. A thin storage module owns all access: an injectable `Storage`-like backend defaulting to `window.localStorage` (so tests inject an in-memory fake), a single deterministic key, and JSON serialization of the same payload shape the table carried — `{ <groupKey>: boolean[] }` plus a note string trimmed to at most 2000 characters and normalized to empty when blank.
- **Keying — per-account keys in a shared browser**: the key is derived from the viewer's session user id (`approver-checklist:{userId}:{submissionId}`), so two accounts on the same machine or browser never read each other's state. The id comes from the client session payload the server already authenticates. The residual exposure — a party with access to the browser's storage who knows another account's user id could read that account's key — is accepted as outside the threat model.
- **No API surface at all**: the endpoints, the two services, the body schema, the shared row types, and the `hasApproverRole`/`requireApproverRole` predicates are deleted. Privacy now holds by the data never leaving the browser. The *rendering* gate stays, but only as the session check it already overlaps with: the section and the read-only card render only when the session reports the `approver` role, so lead-only users, mappers, and anonymous visitors still never see the section.
- **Read path — client only**: the editable section and the read-only card read the key once on mount, client-side after hydration. The component must never access browser storage during server-side rendering.
- **Write path — write-through**: every tick or note change writes the full state to browser storage synchronously. There is no debounce, no pending-writes flush, and no saved/saving indicator — the saving phase no longer exists, and a vote save or unmount can never lose work because the in-memory state is already persisted.
- **Clear semantics**: clearing every tick and the note deletes the key entirely. "Reset to nothing" is now indistinguishable from "never saved", which is the desired outcome — the read-only card renders hidden in both cases, and a finished submission never shows an empty box.
- **Cross-tab sync**: a `storage` event listener adopts changes written by *other* tabs, per field, newer write wins; when another tab removes the key, the state resets to empty. The writing tab applies its own state directly (the event does not fire in the tab that made the change).
- **Graceful degradation**: storage read/write failures (storage disabled, quota exceeded) are caught; the section keeps working in-memory for the session and simply does not persist.
- **DB teardown**: a new migration drops `submission_approver_checklists` (migration 0005 already applied in production, so the drop is additive — 0005 is never edited), and `db/schema/approver-checklists.ts` plus its export in the schema index are removed. The live rows were purged beforehand (2026-08-30): all notes were empty, and the ticks were waived.
- **Components**: `ApproverChecklistSection` and `ApproverChecklistReadonly` keep their rendering logic, rule-group consumption (single source: the shared `submissionRules` module), and layout; only their data source changes. `hasSavedContent` (any tick set or a non-empty note) drives read-only visibility — key absent or content empty renders nothing.
- **Shared glue**: `approver-checklist-state.ts` stays the pure normalization layer (visible groups, seed-from-saved normalization, payload/note normalization, `hasSavedContent`), seeded from the storage module's parsed value instead of a server row.
- **Docs**: ADR-0003 is annotated as superseded by the new ADR-0014 (`approver-checklist-browser-storage`), which records the decision, the considered alternatives (keep the table, dual-write), and the accepted consequences (per-browser persistence, loss modes, shared-browser keying, cross-tab semantics). `CONTEXT.md` is unchanged — `Approver checklist` and `Approver note` remain the canonical terms, and storage location is implementation detail.
- **Unchanged surfaces**: the pre-submission dialog, the vote form, the rule texts, the submission page layout, and the lead decision panel are untouched.

## Testing Decisions

- **Test only external behavior**, not implementation details: a pure function returns the right value for each input; the storage adapter persists and reads back exactly what was written. No tests reach into component internals.
- **One seam — the repo's established pure-function test seam** (`tests/server/utils/*.spec.ts`, node vitest environment, dependency-free modules), reused for both client-side pure modules as before. Existing seams are preferred over inventing a component or DOM harness the repo does not have.
- **Modules tested**:
  - `approver-checklist-state` (adapted): visible groups, seed-from-saved normalization against a parsed browser-storage value, payload/note normalization, and `hasSavedContent` — the same behavior surface as before, ~20 tests.
  - `approver-checklist-storage` (new): with an injected in-memory fake of the `Storage` interface — key composition from user id and submission id; round-trip serialize/parse; write-through save of the full state; key removal when fully cleared; absent key reads as empty state; corrupt or foreign JSON reads as a resilient empty state; storage-event handling (per-field adoption of newer values, key removal resets to empty); read/write errors degrade to in-memory behavior. The in-memory fake mirrors the review-queue module's fake precedent.
- **Dying tests**: `approver-checklist-schema.spec.ts` (11 tests) and the `hasApproverRole` block of `approver-gate.spec.ts` (4 tests) — they test deleted surfaces. `approver-gate.ts` survives for `hasLeadApproverRole`, which the submission-delete endpoint still uses.
- **Explicitly not unit-tested** (no harness exists in this repo): the Vue section and read-only card behavior and the page wiring. These are covered by the repo's manual verification loop — lint, typecheck, test, build — plus manual browser checks of: editable round-trip and prefill, read-only surfacing after review, cross-tab synchronization, shared-browser account separation, and storage-disabled degradation.

## Out of Scope

- Sharing the checklist or note with any other party — other approvers, the lead approver, or the submitting mapper — now or later.
- Making the checklist a voting gate, or surfacing it in vote summaries or the lead decision panel.
- Persistence across browsers, devices, or browser profiles, and persistence after cache clearing or private-browsing sessions; the checklist is documentedly per-browser.
- Resurrecting or migrating the purged database rows, or any server-side storage of checklist data now or later.
- Cleaning up orphaned browser-storage keys after a submission is deleted; keys are tiny and keyed by a UUID that never recurs, so stale keys are harmless.
- Encrypting or tamper-proofing the stored payload, or detecting edits to it.
- Stable per-rule keys, rule versioning, or history of ticks; per-index staleness after a rule-text edit is accepted and documented in ADR-0014.
- Editing the section after the submission has left review (read-only only).
- Markdown or rich-text rendering in the note.
- An approver-side "is this a port?" toggle; port-group visibility is driven solely by the submission's recorded `isPort` fact.
- Any change to the pre-submission dialog or the rule texts themselves.

## Further Notes

- **Governing decision**: ADR-0014 — browser-local storage behind an injectable adapter, per-account keying, write-through saves with cross-tab sync, read-only surfacing after review, and a full teardown of the server surface (table, endpoints, predicates, schema). ADR-0003's storage decision is superseded; its privacy intent is preserved by the data never leaving the author's browser.
- **Glossary**: the canonical terms **Approver checklist** and **Approver note** (recorded in `CONTEXT.md`) are unchanged; use them instead of "rule check-off", "verification log", "private note", or "comment".
- **Rule staleness consequence**: because ticks are per-index booleans within each rule group, a rule-text change updates both the dialog and the section automatically; an existing tick may then sit against the updated text at the same index — accepted as harmless for a private scratchpad (unchanged from the first version).
- **Loss-mode acceptance**: cache clears, private browsing, a second browser, or another device all lose the checklist, and the read-only record after review is equally per-browser. Approvers who review across devices should expect their scratchpad to follow them only within the browser where they wrote it.
- **Data wipe**: the 8 live table rows (all with empty notes) were deleted from the production database on 2026-08-30 ahead of the teardown.
- **Tracker shape**: this re-scoped spec is the umbrella for the storage change. When implementation starts, break the work into numbered tickets continuing from `05` under this feature directory (e.g. `05` storage adapter + state repoint, `06` section/read-only wiring and page cleanup, `07` server and DB teardown plus docs) — the storage adapter and role-roster removal are the smallest independently-shippable slice.

## Comments

- 2026-08-30 — Re-scoped from the ADR-0003 per-approver table to browser-local storage (ADR-0014 supersedes). Live `submission_approver_checklists` rows purged (all notes empty, ticks waived). Design settled by grilling session: full replacement (no dual-write), localStorage via injectable adapter, per-account keying, write-through saves with cross-tab sync, no saved indicator, table dropped by new migration. The four earlier tickets (01–04) remain as the historical record of the database-backed version.