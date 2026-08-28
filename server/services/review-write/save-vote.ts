import { createError } from 'h3'

import type {
  LeadDecisionInput,
  SubmissionVoteInput,
} from '~/shared/schemas/review'
import {
  REJECTION_ATTACHMENT_MESSAGES,
  assessRejectionAttachments,
  computeAttachmentReplacement,
} from '~/server/utils/attachment-rules'

import type {
  FinalFilterRecord,
  ReviewWriteDeps,
  ReviewWriteStore,
  SubmissionRecord,
  VoteRecord,
} from './types'

interface GuardedWriteOptions {
  notFoundMessage: string
  notPendingMessage: string
}

/** Shared transaction spine for review writes: re-read the submission inside
 *  the transaction, fail with a conflict when it is no longer `pending`, run
 *  the kind-specific write step, then compensate storage after the commit.
 *  A throw inside the transaction discards every row the step wrote — the
 *  loser of a race that flips the status between the write starting and the
 *  re-read rolls back instead of committing. */
async function runGuardedWrite<T>(
  deps: ReviewWriteDeps,
  submissionId: string,
  options: GuardedWriteOptions,
  write: (
    store: ReviewWriteStore,
  ) => Promise<{ result: T; removedUrls: string[] }>,
): Promise<T> {
  let outcome: { result: T; removedUrls: string[] } | undefined

  await deps.runTransaction(async (store) => {
    const submission = await store.getSubmission(submissionId)
    if (!submission) {
      throw createError({
        statusCode: 404,
        statusMessage: options.notFoundMessage,
      })
    }
    if (submission.status !== 'pending') {
      throw createError({
        statusCode: 409,
        statusMessage: options.notPendingMessage,
      })
    }
    outcome = await write(store)
  })

  await deps.deleteStorageObjects(outcome!.removedUrls)
  return outcome!.result
}

export interface ReviewWriteService {
  saveVote(
    submissionId: string,
    approverUserId: string,
    input: SubmissionVoteInput,
  ): Promise<VoteRecord>
  finalizeSubmission(
    submissionId: string,
    leadUserId: string,
    input: LeadDecisionInput,
  ): Promise<SubmissionRecord>
}

/** Binds the review-write spine to a concrete store/transaction and storage
 *  implementation. Production wiring lives in `./index.ts`; the tests bind the
 *  in-memory fake. */
export function createReviewWriteService(deps: ReviewWriteDeps): ReviewWriteService {
  return {
    async saveVote(submissionId, approverUserId, input) {
      const { publicBaseUrl, allowedPrefix } = deps.attachmentScope()
      const verdict = assessRejectionAttachments({
        isRejection: input.approvalDecision === 'no',
        reason: input.rejectionReason,
        attachments: input.attachments,
        publicBaseUrl,
        allowedPrefix,
      })
      if (!verdict.ok) {
        // The rule-failure-to-error mapping exists exactly once, here in the
        // spine, shared by the vote and decision write paths.
        throw createError({
          statusCode: 400,
          statusMessage: REJECTION_ATTACHMENT_MESSAGES[verdict.reason],
        })
      }

      return runGuardedWrite(
        deps,
        submissionId,
        {
          notFoundMessage: 'Submission not found',
          notPendingMessage: 'Only pending submissions can be voted on',
        },
        async (store) => {
          const vote = await store.upsertVote({
            submissionId,
            approverUserId,
            approvalDecision: input.approvalDecision,
            rejectionReason: input.rejectionReason,
            rejectionExplanation: input.rejectionExplanation,
          })

          // The proposed Course filters are replaced wholesale.
          await store.replaceVoteFilters(vote.id, input.filters)

          // Diff the stored attachment set against the incoming list; every
          // URL that drops out is deleted from storage after the commit, so
          // a storage hiccup can never fail an already-committed save.
          const removed = computeAttachmentReplacement(
            await store.listVoteAttachments(vote.id),
            verdict.attachments,
          ).removed

          await store.replaceVoteAttachments(vote.id, verdict.attachments)

          return {
            result: vote,
            removedUrls: removed.map((attachment) => attachment.url),
          }
        },
      )
    },

    async finalizeSubmission(submissionId, leadUserId, input) {
      const { publicBaseUrl, allowedPrefix } = deps.attachmentScope()
      const verdict = assessRejectionAttachments({
        isRejection: input.status === 'rejected',
        reason: input.decisionNotes,
        attachments: input.attachments,
        publicBaseUrl,
        allowedPrefix,
      })
      if (!verdict.ok) {
        // Same rule-failure-to-error mapping as the vote path — the shared
        // spine owns it, once.
        throw createError({
          statusCode: 400,
          statusMessage: REJECTION_ATTACHMENT_MESSAGES[verdict.reason],
        })
      }

      return runGuardedWrite(
        deps,
        submissionId,
        {
          notFoundMessage: 'Submission not found',
          notPendingMessage: 'Only pending submissions can be finalized',
        },
        async (store) => {
          // `isRanked` is derived from `state` at write time: the decision
          // wire carries no `isRanked`, so the stored column always reflects
          // the invariant (`isRanked ⇔ state = 'ranked'`).
          const finalFilters: FinalFilterRecord[] = input.filters.map(
            (filter) => ({
              courseId: filter.courseId,
              mode: filter.mode,
              nubTier: filter.nubTier,
              proTier: filter.proTier,
              state: filter.state,
              isRanked: filter.state === 'ranked',
              notes: filter.notes,
            }),
          )

          // An approval writes the Finalized filters; a rejection leaves none.
          await store.replaceFinalFilters(
            submissionId,
            input.status === 'approved' ? finalFilters : [],
            leadUserId,
          )

          // Decision attachments are written once and never edited, so there
          // is nothing to diff and nothing to delete from storage — the write
          // step always reports no removals.
          if (input.status === 'rejected' && verdict.attachments.length > 0) {
            await store.insertDecisionAttachments(
              submissionId,
              verdict.attachments,
            )
          }

          const updated = await store.completeSubmission(submissionId, {
            status: input.status,
            decisionByUserId: leadUserId,
            decisionNotes: input.decisionNotes,
            approvedAt: input.status === 'approved' ? new Date() : null,
            rejectedAt: input.status === 'rejected' ? new Date() : null,
          })

          if (!updated) {
            // Belt-and-braces: the in-transaction re-read already verified
            // `pending`, so a zero-row guarded update means the status moved
            // between the re-read and the write. A clear conflict instead of
            // an empty 200 — and the throw rolls the whole write back.
            throw createError({
              statusCode: 409,
              statusMessage: 'Only pending submissions can be finalized',
            })
          }

          return { result: updated, removedUrls: [] }
        },
      )
    },
  }
}