import type { SubmissionInput } from '~/shared/schemas/submission'

import { withTransaction } from '~/db/client'
import { notifySubmissionCreated } from '~/server/services/notifications'
import { deleteStorageObjects } from '~/server/utils/storage'

import { transactionStore } from './drizzle-store'
import { createSubmissionContentService } from './save-submission-content'
import type {
  SubmissionContentDeps,
  SubmissionContentStore,
} from './types'

/** Runs the spine on a real Drizzle transaction: the store adapter binds to
 *  the transaction client, commits on resolve and discards on throw. */
function runTransaction<T>(
  fn: (store: SubmissionContentStore) => Promise<T>,
): Promise<T> {
  return withTransaction((tx) => fn(transactionStore(tx)))
}

/** Production wiring: real transaction, real best-effort storage cleanup,
 *  and the real Discord notifier. */
const submissionContentService = createSubmissionContentService({
  runTransaction,
  deleteStorageObjects,
  notifySubmissionCreated,
} satisfies SubmissionContentDeps)

/** Bound entry point: the create endpoint stays a thin parse-and-delegate
 *  adapter. */
export function createSubmission(
  createdByUserId: string,
  input: SubmissionInput,
) {
  return submissionContentService.createSubmission(createdByUserId, input)
}

/** Bound entry point: the owner-edit endpoint stays a thin
 *  parse-and-delegate adapter. */
export function updateSubmission(
  submissionId: string,
  ownerUserId: string,
  input: SubmissionInput,
) {
  return submissionContentService.updateSubmission(
    submissionId,
    ownerUserId,
    input,
  )
}

/** Bound entry point: the delete endpoint stays a thin parse-and-delegate
 *  adapter (the lead-approver path passes no owner). */
export function deleteSubmission(submissionId: string, ownerUserId?: string) {
  return submissionContentService.deleteSubmission(submissionId, ownerUserId)
}

export type {
  SubmissionContentDeps,
  SubmissionContentStore,
  SubmissionContentTransaction,
  SubmissionContentWrite,
  SubmissionCourseWrite,
  SubmissionMapperWrite,
  SubmissionRecord,
  SubmissionRow,
} from './types'