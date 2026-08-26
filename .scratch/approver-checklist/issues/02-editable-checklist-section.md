# 02: Editable checklist section beside the vote form

**What to build:** The live Approver checklist section next to the vote form for a pending submission in vote mode. A plain approver sees all the same rule groups the mapper acknowledges before submitting — rendered at once, each group collapsible and expanded by default, the porting group only when the submission is a port — with an independent checkbox per rule and the Approver note textarea at the bottom. Changes auto-save (debounced) with a subtle saved/saving indicator, prefill when the approver returns, and are flushed when the vote is saved or the view unmounts, so saving the vote never drops a pending tick or note. The section is purely advisory: it never gates or influences the vote.

**Blocked by:** 01 — Checklist persistence and API spine

**Status:** ready-for-agent

- [x] On a pending submission in vote mode, a plain approver sees the section beside the vote form: two-column on desktop, stacked on mobile.
- [x] The section renders the same rule groups as the pre-submission dialog — naming, courses, ranked, jumpstat, porting, other — all at once on one page.
- [x] Each group is collapsible and expanded by default; the porting group renders only when the submission is a port.
- [x] Each rule has an independent checkbox that toggles freely; the Approver note (free text, up to 2000 characters) sits at the bottom of the section.
- [x] Changes auto-save (debounced) with a subtle saved/saving indicator; ticks and the note survive closing the submission and prefill when the approver returns.
- [x] Pending changes are flushed when the vote is saved and when the view unmounts, so a tick or note change made immediately before Save Vote is never lost.
- [x] Saving a fully-emptied state (every box unchecked, note cleared) persists as an explicit reset rather than erasing the saved record.
- [x] The checklist is purely advisory: Save Vote succeeds regardless of how many rules are ticked, and the section never contributes to the vote payload or to vote summaries.

## Comments

Implemented and verified 2026-08-26:

- Section: `ApproverChecklistSection.vue` — renders every shared rule group (`submissionRulesSteps`, the single source also used by the pre-submission dialog) all at once; each group is a `UCollapsible` expanded by default (aria-expanded on the trigger); port-group visibility driven solely by the submission's `isPort` fact. Independent checkbox per rule, note textarea (maxlength 2000 + counter) at the bottom.
- Auto-save: ~1 s debounced PUT of the whole section state on any change, serialized on a promise chain so a later snapshot can never be overtaken by an earlier in-flight PUT; subtle Saving…/Saved/Save failed indicator; `flush()` cancels the debounce and awaits the final write. Vote save awaits the flush (`beforeSave` prop on `ApproverVoteForm`); the section also flushes fire-and-forget on unmount. Nothing persists while the payload still equals the loaded baseline — an untouched never-saved checklist creates no row, while a genuine reset-to-nothing save still persists as an explicit reset.
- Layout: two-column grid beside the vote form on desktop (`lg:grid-cols-2`, checklist card sticky at top-6), stacked on mobile; wrapped so the grid item stretches and the card pins while scrolling.
- Privacy/roles: the section renders only for plain approvers (mirrors the API's `isPlainApprover`); lead approvers and mappers never see it, and no checklist request fires on their pages. Purely advisory — no coupling to the vote payload or summaries.
- Pure-function seam: `components/review/approver-checklist-state.ts` (visible groups, seed-from-saved normalization, payload/note normalization) + `approver-checklist-state.spec.ts` (14 tests). Full suite 75 passing; typecheck, lint (2 pre-existing warnings only), and build clean.
- Browser battery (dev server + minted sessions for a plain approver, a lead-approver, and a roleless mapper): groups render all-at-once with porting only on a port submission; collapse/expand works; checkbox and note autosave to the DB with the Saved indicator and prefill on return; pending change survived an immediate Save Vote (vote + tick both persisted, then page navigated to /review); explicit reset kept the row with an all-false checklist and null note; a never-saved approver who voted created no checklist row; desktop two-column (1440px) vs mobile stacked (390px) verified; sticky pinning verified; lead-approver in vote mode and mapper see no section. All test data cleaned up afterwards.
- Out-of-scope note (pre-existing, unrelated): `saveVote` 500s when a vote is submitted with zero filters (`values() must be called with at least one value` in `server/services/votes/save-vote.ts:118`) — hit while staging a valid minimal vote for the flush test, worked around by keeping one filter enabled.
- Reviewed via code-review skill (parallel Standards + Spec sub-agents; fix-ups incorporated): Standards — 0 hard violations, 4 P2 judgement calls (duplicated markdown-render + v-html wrapper vs the dialog, deferred per reviewer; `normalizeNote` cross-layer mirror, documented; `baseline` renamed to `persistedPayload`; test seam naming quirk, accepted). Spec — 8/8 criteria, P1 fixed (enqueueSave/flush/unmount now no-op until the initial GET settles, so a vote-save during the load window can no longer write a synthetic empty state and overwrite saved ticks); P2 fixed (failed flush can no longer abort the vote — advisory guarantee holds, error surfaces on the section indicator). Re-verified in the browser after the fixes.