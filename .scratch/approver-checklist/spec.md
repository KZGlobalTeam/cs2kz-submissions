# Approver Checklist and Note

Status: `ready-for-agent`

## Problem Statement

When an approver reviews a submission, they have no way to keep a private record of which submission rules they have verified, and no place to jot observations for themselves while reviewing. The only rule listing in the product is the modal a mapper clicks through before creating a submission — it belongs to the submission flow, not the review flow, and nothing an approver does with it is saved or shown anywhere. An approver who wants to check "have I confirmed the jumpstat requirements?" or "did I note anything odd about course 3?" must hold that state in their head or in a tab outside the app. The gap is compounded by the fact that reviews often span sessions — a map is inspected on the workshop, revisited, then voted on — so in-session scratch work is easily lost. Any such checklist must also stay private: approver votes are shared among reviewers, and nothing approver-internal may leak to other approvers, to the lead approver, or to the submitting mapper.

## Solution

An approver gets a checklist section next to the vote form. It shows the same groups of rules the mapper acknowledges before submitting — naming, courses, ranked, jumpstat, porting, other — all at once on one page, split into collapsible groups. The porting group appears only when the submission is a port. Each rule has its own checkbox the approver may freely check and uncheck, and a free-text note sits at the bottom of the section. Everything is auto-saved (debounced) as the approver works, so ticks and the note survive across sessions without forcing a vote; the saved state prefills the section when the approver returns. When the submission has left review, the section remains visible read-only — but hidden entirely if the approver never saved anything. The checklist and note are private to the one approver who wrote them: never shown to other approvers, the lead approver, or the submitting mapper, and stored separately from votes so that privacy holds by construction.

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
9. As an approver, I want my ticks and note to survive closing and reopening the submission across sessions, so that multi-session reviews don't restart from scratch.
10. As an approver, I want my saved ticks and note to prefill the section when I return, so that I can continue where I left off.
11. As an approver, I want a subtle saved/saving indicator on the section, so that I know my changes were persisted.
12. As an approver, I want a free-text note at the bottom of the section, so that I can record private observations while reviewing.
13. As an approver, I want the note saved with the same auto-save as my ticks, so that notes persist exactly like ticks.
14. As an approver, I want my note and ticks not to be lost when I click Save Vote and navigate away, so that saving the vote never costs me unpersisted checklist work.
15. As an approver, I want the section to be purely advisory, so that I can vote Yes even if I haven't personally re-verified every rule.
16. As an approver, I want my checklist and note visible only to me, so that my working notes never influence other reviewers or the submitting mapper.
17. As an approver, I want other approvers never to see my checklist or note, so that my private verification state stays private even within the review team.
18. As an approver viewing a submission that has left review, I want my checklist and note still visible read-only, so that I can reference what I verified after the fact.
19. As an approver, I want the read-only checklist hidden entirely when I never saved anything, so that finished submissions never show empty boxes.
20. As an approver, I want the read-only view to be non-editable, so that finalized review artifacts stay exactly as they were.
21. As an approver who also holds the `lead_approver` role, I still want to see my own checklist section and note, so that my additional role never hides my private verification record.
22. As a user who holds only `lead_approver`, I want to never see the checklist section or its content anywhere, so that my approval decisions rest on votes and map facts, not approvers' private scratchpads.
23. As a submitting mapper, I want to never see any approver's checklist or note, so that review stays internal.
24. As an anonymous user, I want the checklist endpoints to reject me, so that private review data stays internal.
25. As a user who holds only `lead_approver`, I want the API to reject my checklist requests, so that the approver-only boundary holds server-side even against crafted requests.
26. As an approver, I want my checklist data removed when the submission is deleted, so that no orphaned private data lingers.
27. As a developer, I want the rule text defined once and shared by both the pre-submission dialog and the approver checklist, so that editing a rule updates both surfaces.
28. As a developer, I want saved ticks keyed by rule group and index, so that a rule-text change is reflected on both surfaces without any data migration.
29. As a developer, I want the endpoints to read and upsert only the caller's own row keyed by submission and approver, so that concurrent saves from separate approvers never collide.
30. As a developer, I want checklist payloads validated against a shared body schema, so that malformed payloads are rejected with clear errors.
31. As a developer, I want unchecking every rule and clearing the note to persist as a real saved state, so that "reset to nothing" is not confused with "never saved".
32. As an approver, I want the section laid out beside the vote form on desktop and stacked on mobile, so that I can work both surfaces without horizontal scrolling.

## Implementation Decisions

- **Storage — dedicated per-approver table** (per ADR-0003): one row per (submission, approver), carrying `checklist` as a JSON object mapping rule-group key to a boolean array (`{ <groupKey>: boolean[] }`) plus a nullable `note` text column and timestamps. A unique constraint on (submission, approver) and cascade delete with the submission.
- **API — dedicated owned-resource endpoints** `GET` and `PUT /api/submissions/[id]/approver-checklist`. GET returns the caller's own row or an empty state; PUT upserts the caller's own row. The data never enters the shared submission-detail or votes payload — the detail payload is cached client-side under a per-submission key shared across users, so embedding per-user private data there would risk a cross-user cache leak. Privacy holds by construction instead.
- **Auth — precise approver-role gate**: the user must hold the `approver` role; holding `lead_approver` on top of it changes nothing — an approver who is also a lead sees their own private checklist, never anyone else's. The shared `requireApprover` guard deliberately admits lead-*only* users too, which the checklist must not, so a dedicated predicate (`hasApproverRole`) is used at the API boundary instead.
- **Body schema**: `checklist` is `Record<string, boolean[]>` with loose keys (the rule set can change without breaking saves — unknown keys are merely never rendered), and `note` is a string trimmed to at most 2000 characters, normalized to `null` when empty.
- **Single source of rule text**: the section consumes the same shared rules module as the pre-submission dialog; group keys, titles, and rule texts are never duplicated.
- **Section component** (`ApproverChecklistSection`): renders all rule groups at once, each collapsible and default-expanded; the porting group renders only when the submission's `isPort` fact is true (no toggle — the dialog's "is this a port?" question is replaced by the submission's recorded fact); a checkbox per rule; a note textarea at the bottom.
- **Editable rendering**: beside the vote form (two-column on desktop, stacked on mobile) while the submission is pending, in vote mode, for a plain approver.
- **Read-only rendering**: outside editable mode, for the same approver, including after the submission is approved or rejected; controls disabled; the section is hidden entirely when the approver never saved anything (no ticks and empty note), and shown otherwise.
- **Auto-save**: a debounced (~1 s) PUT of the whole section state on any change; pending writes are flushed when the vote is saved or the view unmounts; a subtle saved/saving indicator communicates persistence state.
- **Advisory only**: no validation coupling — the vote saves regardless of checklist state, and the checklist never contributes to vote summaries or the lead decision panel.
- **Unchanged surfaces**: the pre-submission dialog and its rule content are untouched; it already consumes the shared rules module this feature reuses.

## Testing Decisions

- **Test only external behavior**, not implementation details: a schema accepts valid payloads and rejects each invalid shape with its error path; a predicate returns the right verdict for every role-set combination. No tests reach into component internals or storage internals.
- **One seam — the repo's established pure-function test seam** (`tests/server/utils/*.spec.ts`, node vitest environment, dependency-free modules). Existing seams are preferred over inventing a DB or component harness the repo does not have.
- **Modules tested**: the shared checklist body schema (accept/reject behavior), and the role predicate (full truth table over role-set combinations: approver only, approver + lead, lead only, neither — only the two with the explicit `approver` role pass).
- **Prior art**: the schema behavior spec mirrors `submission-input-schema` (zod accept/reject behavior with error paths); the predicate truth table mirrors `submission-mutability`.
- **Explicitly not unit-tested** (no harness exists in this repo): the DB upsert service, the HTTP handlers, and the Vue section behavior. These are covered by the repo's manual verification loop — lint, typecheck, test, build — plus manual browser checks of the two rendering modes, auto-save/flush, and privacy.

## Out of Scope

- Sharing the checklist or note with any other party — other approvers, the lead approver, or the submitting mapper — now or later.
- Making the checklist a voting gate, or surfacing it in vote summaries or the lead decision panel.
- Stable per-rule keys, rule versioning, or history of ticks; per-index staleness after a rule-text edit is accepted and documented in ADR-0003.
- Editing the section after the submission has left review (read-only only).
- Markdown or rich-text rendering in the note.
- An approver-side "is this a port?" toggle; port-group visibility is driven solely by the submission's recorded `isPort` fact.
- Any change to the pre-submission dialog or the rule texts themselves.

## Further Notes

- **Governing decision**: ADR-0003 — private per-approver table, dedicated owned-resource endpoints, precise approver-role gate, debounced auto-save with flush-on-vote-save/unmount, read-only surfacing after review.
- **Glossary**: the feature introduces the canonical terms **Approver checklist** and **Approver note** (recorded in `CONTEXT.md`); use them instead of "rule check-off", "verification log", "private note", or "comment".
- **Rule staleness consequence**: because ticks are per-index booleans within each rule group, a rule-text change updates both the dialog and the section automatically; an existing tick may then sit against the updated text at the same index — accepted as harmless for a private scratchpad.
- **Tracker shape**: this spec is the umbrella for the feature. When implementation starts, break the work into numbered tickets under this feature directory per repo conventions (e.g. schema + storage service, the two endpoints, the section component, page wiring/rendering modes) — the schema and role predicate are the smallest independently-shippable slice.