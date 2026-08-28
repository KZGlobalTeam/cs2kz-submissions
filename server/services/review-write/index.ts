import type { SubmissionVoteInput } from '~/shared/schemas/review'

import { withTransaction } from '~/db/client'
import { REJECTION_ATTACHMENT_PREFIX } from '~/server/utils/attachment-rules'
import {
  deleteStorageObjects,
  getBucketPublicBaseUrl,
} from '~/server/utils/storage'

import { transactionStore } from './drizzle-store'
import { createReviewWriteService } from './save-vote'
import type { ReviewWriteDeps, ReviewWriteStore } from './types'

/** Runs the spine on a real Drizzle transaction: the store adapter binds to
 *  the transaction client, commits on resolve and discards on throw. */
function runTransaction<T>(
  fn: (store: ReviewWriteStore) => Promise<T>,
): Promise<T> {
  return withTransaction((tx) => fn(transactionStore(tx)))
}

/** Production wiring: real transaction, real best-effort storage cleanup,
 *  and the real bucket facts for the rejection-attachment rules. */
const reviewWriteService = createReviewWriteService({
  runTransaction,
  deleteStorageObjects,
  attachmentScope: () => ({
    publicBaseUrl: getBucketPublicBaseUrl(),
    allowedPrefix: REJECTION_ATTACHMENT_PREFIX,
  }),
} satisfies ReviewWriteDeps)

/** Bound entry point: the endpoint stays a thin parse-and-delegate adapter. */
export function saveVote(
  submissionId: string,
  approverUserId: string,
  input: SubmissionVoteInput,
) {
  return reviewWriteService.saveVote(submissionId, approverUserId, input)
}

export type {
  ReviewWriteDeps,
  ReviewWriteStore,
  ReviewWriteTransaction,
  SubmissionRecord,
  VoteRecord,
  VoteWrite,
} from './types'