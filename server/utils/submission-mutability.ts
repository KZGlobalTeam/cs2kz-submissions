import type { SubmissionStatus } from '~/shared/types/submission'

/**
 * Pure domain rule (ADR 0002): a submission may be mutated by its owner only
 * while it is `pending` and unreviewed — zero approver votes. The first vote
 * (yes or no) moves the submission *in review* and closes the window
 * permanently; a decision (`approved`/`rejected`) leaves it closed regardless
 * of vote count.
 *
 * Called from inside the owner edit/delete write transactions after
 * re-reading the row and its vote count, so the check and the write are
 * atomic against a vote landing mid-request.
 */
export function canMutateSubmission(opts: {
  status: SubmissionStatus
  voteCount: number
}): boolean {
  return opts.status === 'pending' && opts.voteCount === 0
}