# 02: Delete my unreviewed submission

**What to build:** A submitter can delete their own submission from My Submissions while it is pending and unreviewed (zero approver votes). The Delete action is hidden at render time the moment any approver votes, deletion requires confirmation, and the submission is hard-deleted with its stored course and port images removed from storage best-effort. The lead approver's existing delete capability is unchanged. This ticket also introduces the domain guard — a submission may be mutated only while pending with zero votes — as a tested pure function, and adds the per-row vote count the client needs to hide the action.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The My Submissions table shows a Delete action on rows that are pending with zero votes; it never renders once any vote (yes or no) exists, nor on approved or rejected rows.
- [x] Deleting a vote-free pending submission requires explicit confirmation, then hard-deletes the submission and its related rows; the row disappears from the list.
- [x] The submission's stored course and port images are removed from storage best-effort after the delete; a storage failure never fails the delete itself.
- [x] A non-creator — a co-mapper or any other logged-in user — receives an opaque 404 from the delete request; an anonymous user is rejected.
- [x] A creator deleting a submission that has gained even one vote receives a clear conflict response ("review has started") and nothing is deleted — including when the vote lands between page render and request, because the guard is re-checked inside the delete transaction.
- [x] The mutability guard is a pure function in the server utils seam, spec'd in the existing test style: pending with zero votes → mutable; any vote → not mutable; approved or rejected → not mutable.
- [x] The "mine" submissions list returns a computed vote count per row, so the action can be hidden without an extra request.
- [x] The lead approver can still delete any submission regardless of votes.

## Answer

Implemented in commit `a4c2f50`. The pure guard `canMutateSubmission({ status, voteCount })` lives in `server/utils/submission-mutability.ts` and is spec'd at `tests/server/utils/submission-mutability.spec.ts` (full truth table). The delete endpoint (`server/api/submissions/[id].delete.ts`) now authenticates every caller: lead approvers keep the unrestricted path (any submission, any votes), everyone else goes through the owner path in `server/services/submissions/delete-submission.ts` — opaque 404 for non-creators, and the mutability guard re-checked inside the write transaction so a vote landing between render and request still yields 409 “Review has started” with nothing deleted. After the delete commits, stored course images, the port-authorization image, and any vote/decision attachment objects are removed best-effort via the generalized `deleteStorageObjects` (renamed from `deleteRejectionAttachmentObjects`), which now also swallows storage misconfiguration so a committed delete can never fail. `listOwnSubmissions` returns a computed `voteCount` per row (timestamps now ISO strings, matching the review list), and My Submissions renders a Delete action — through the existing `CommonConfirmDialog` — only while `status === 'pending' && voteCount === 0`. Verification loop green: lint, 46 tests, typecheck, build.