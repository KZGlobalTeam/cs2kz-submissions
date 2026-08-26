# Owner Edit/Delete of Unreviewed Submissions

Status: `ready-for-agent`

## Problem Statement

A submitter has no way to fix a mistake in a submission once it is created. The submission is immutable to its creator from the moment it is posted — the create form promises "you won't be able to edit it after submission" — and the only delete path is the lead approver's cleanup endpoint. If a mapper notices a typo in the map name, a wrong workshop URL, a broken course image, or simply wants to withdraw a submission before any approver has looked at it, they cannot. Their only recourse is to leave the incorrect submission in the queue and hope an approver rejects it.

The tension is that approvers must be free to vote on what was actually submitted: once review starts, the content must be frozen or a vote can evaluate something that no longer exists. So the fix is a window, not full freedom: a submitter may manage their own submission **until the review begins**, and the window closes forever at the first approver vote.

## Solution

A submitter may edit or delete their own submission while it is `pending` and **unreviewed** (zero approver votes). The first vote — either `yes` or `no` — moves the submission **in review**, and from that moment the edit/delete window is closed permanently for the owner. The submissions table shows Edit and Delete actions only while the window is open and the buttons are hidden at render time as soon as a vote exists — there is no click-through warning, because the blocked state is never reachable from the UI. Editing opens a copy of the new-submission form pre-filled with the current content; deleting asks for confirmation and hard-deletes the submission, removing its uploaded images from storage as well.

The rule is enforced server-side, inside the write transaction, so it holds even against a vote that lands while the owner is mid-edit, and even against crafted requests. The lead approver's existing ability to delete any submission is unchanged.

## User Stories

1. As a submitting mapper, I want to edit my submission while it is pending and no approver has voted yet, so that I can fix mistakes or update my map before review begins.
2. As a submitting mapper, I want to edit every field I entered at submission time — map name, workshop URL, notes, port evidence, mappers, and courses including their images — so that an edited submission can be exactly as complete as a new one.
3. As a submitting mapper, I want my edited workshop URL to update the workshop ID stored on the submission, so that the submission always points at the correct workshop item.
4. As a submitting mapper, I want to add, remove, reorder, and re-image courses during an edit, so that the course list matches the final state of the map.
5. As a submitting mapper, I want to see focused Edit and Delete actions on each pending, vote-free row of My Submissions, so that I can manage the submission in place.
6. As a submitting mapper, I want the Edit and Delete actions to be hidden as soon as any approver has voted, so that I never discover the blocked state by clicking.
7. As a submitting mapper, I want no Edit or Delete actions on my approved or rejected submissions, so that decisions remain final.
8. As a submitting mapper, I want the edit page to open pre-filled with the current submission content, so that I only change what needs changing.
9. As a submitting mapper, I want to be redirected away from the edit page if my submission is already in review or no longer pending by the time I open it, so that a locked submission can never be edited.
10. As a submitting mapper, I want to save an edit from the form and land back on My Submissions, so that I have immediate feedback that the change stuck.
11. As a submitting mapper, I want deleting my vote-free submission to require explicit confirmation, so that accidental deletions are prevented.
12. As a submitting mapper, I want a deleted submission to disappear from My Submissions immediately, so that the list reflects reality.
13. As a submitting mapper, I want my course and port images removed from storage when I delete the submission, so that no orphaned files accumulate.
14. As a submitting mapper, I want images I replace during an edit removed from storage, so that replaced screenshots do not pile up.
15. As a submitting mapper, I want the create form's confirmation copy to state the real rule — editable until approvers start voting — so that I do not believe my submission is frozen the moment I submit it.
16. As a submitting mapper whose edit races an approver's vote, I want my save to fail with a clear conflict message, so that I understand why my changes were not applied.
17. As a co-mapper listed on a submission I did not create, I want no way to edit or delete that submission, so that only its creator manages it.
18. As an approver, I want the content of a submission to be frozen the moment I vote, so that what I reviewed is what can be approved.
19. As an approver, I want my vote to be impossible for the submitter to erase through editing or deleting, so that review integrity holds.
20. As a lead approver, I want to keep deleting any submission regardless of votes, so that my cleanup capability is preserved.
21. As a lead approver, I want the owner edit/delete rule to be enforced server-side, so that it cannot be bypassed by a crafted request.
22. As an anonymous user, I want to be rejected by the edit and delete endpoints, so that submissions stay protected.
23. As a developer, I want the pending-and-unreviewed guard as a tested pure function, so that the core invariant is verified at the repo's existing unit seam.

## Implementation Decisions

- **New write path for edits**: `PUT /api/submissions/[id]` accepts the exact same validated request shape as creation — the map-name, workshop-URL, and course-name rules and the port-evidence cross-field constraints are identical, so no new body schema is invented. The handler authenticates the user, loads the submission, and delegates to an update service.
- **The mutability guard (the tested seam)**: a pure `canMutateSubmission({ status, voteCount })` predicate encodes the rule — mutable only while `pending` with zero votes. Both the edit service and the delete service (owner path only) call it from inside their write transactions, after re-reading the row and its vote count, so the check and the write are atomic.
- **Edit semantics — full replace**: the update service, in one transaction, rewrites the submission row (recomputing `workshop_id` from the workshop URL, preserving `created_at`, bumping `updated_at`) and replaces the mapper and course rows, including per-course mapper links. No migration or schema change is required.
- **Delete semantics**: the existing delete endpoint gains an owner path — owner and pending and vote-free → hard delete — while the lead approver path stays unrestricted. The hard delete relies on the existing DB-level cascade for all related rows.
- **Conflict results**: a non-creator who hits the edit or owner-delete path receives an opaque 404 (no existence leak); a creator whose submission is no longer pending or vote-free receives a 409 whose message says review has started. The same guard protects an edit save from a vote that lands mid-edit.
- **Read-side support for hiding buttons**: the "mine" list rows gain a computed `voteCount`, and the submission detail response gains a server-derived editable indicator for the owner. The derived indicator is necessary because the detail endpoint already strips the votes payload from non-approvers, so the edit page cannot infer the state from `votes`.
- **UI**: My Submissions gains an actions cell rendering Edit and Delete only when the row is `pending` and vote-free; there is deliberately no toast or dialog for the blocked state because the action is never rendered. Delete goes through the existing confirmation dialog. Edit navigates to a per-submission edit page that reuses the existing submission form, pre-filled from the detail endpoint; the page refuses — by redirecting — anything that is not owned, pending, and vote-free, and saves via the new PUT. The create form's confirmation copy is reworded to the true rule (editable until review starts).
- **Storage cleanup**: best-effort object removal after commit, reusing the existing URL→key reverse mapping. On delete, every stored image of the submission is removed (course images, the port-authorization image, and any attachment objects); on edit, old image objects not referenced by the saved content are removed. Storage failures are logged and never fail the already-committed write. Cleanup applies to the owner paths and the lead-approver delete path alike.

## Testing Decisions

- **One seam, the highest the repo conventions allow**: the pure mutability guard lives in the `server/utils/` seam and is spec'd at `tests/server/utils/`. The repo has no DB or HTTP test infrastructure, and services/handlers are not unit-tested by convention — the image-pack feature set that precedent explicitly.
- **What makes a good test here**: external behavior only — feed the guard status and vote-count values and assert the verdict: `pending` with zero votes permits mutation; `pending` with one or more votes (either decision) denies it; `approved`/`rejected` deny it regardless of vote count.
- **Prior art**: the existing server-utility specs — `attachment-rules`, `image-validation`, `export-release`, `image-pack` — are the model to follow for style and placement.
- **Not unit-tested** (matching prior art): the thin handlers, the DB services that call the guard inside their transactions, the storage-cleanup callers, and the UI.
- **End-to-end gate**: the repo verification loop (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`), plus a browser pass with playwright-cli to confirm the buttons render only on pending, vote-free rows, hidden once a vote exists, and that the edit flow and delete confirmation work.

## Out of Scope

- Editing or deleting approved or rejected submissions, and any fix-and-resubmit loop for rejections — a rejected submission is terminal; fixing it means creating a new submission.
- Edit/delete access for co-mappers (mappers listed on a submission they did not create) — creator only.
- Soft delete, archiving, restore, or an audit trail for deletions.
- Optimistic concurrency for concurrent owner edits — two simultaneous saves both pass the guard and the last writer wins; both are still bound by the vote rule.
- Back-filling orphaned storage objects uploaded before this feature shipped.
- Any change to the review side — voting, decision, finalize — or to what approvers see in the review UI.
- Notifying approvers that an unreviewed submission was edited.

## Further Notes

- The only tolerated race is a vote committed at the exact instant an owner save commits; both transactions observe the vote count inside their own transaction, and the ADR accepts this small window at this scale.
- The detail endpoint's existing non-approver vote-stripping is why the editable indicator must be computed server-side rather than inferred from the votes payload on the client.
- The create form's "you won't be able to edit it after submission" copy contradicts the new rule and must change with this feature.
- No schema or migration changes: `voteCount` and the editable indicator are computed values.
- Recorded as ADR 0002 (*the submitting mapper may edit or delete their own submission only while it is pending and unreviewed*), and the glossary terms Submission, Unreviewed, and In review are in `CONTEXT.md`; this spec uses that vocabulary.