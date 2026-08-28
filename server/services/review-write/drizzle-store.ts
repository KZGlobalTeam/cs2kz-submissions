import { eq } from 'drizzle-orm'

import type { TransactionClient } from '~/db/client'
import {
  submissionVoteAttachments,
  submissionVoteFilters,
  submissionVotes,
  submissions,
} from '~/db/schema'
import { toRejectionAttachments } from '~/server/utils/attachment-rules'

import type { ReviewWriteStore, VoteWrite } from './types'

/** Binds the Review-write store contract to a Drizzle transaction client. */
export function transactionStore(tx: TransactionClient): ReviewWriteStore {
  return {
    async getSubmission(submissionId) {
      const [row] = await tx
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1)
      return row ? { id: row.id, status: row.status } : null
    },

    async upsertVote(input: VoteWrite) {
      // A single upsert on the unique (submission, approver) constraint: a
      // same-approver double-submit updates the existing row instead of
      // hitting a unique-violation 500.
      const [vote] = await tx
        .insert(submissionVotes)
        .values({
          submissionId: input.submissionId,
          approverUserId: input.approverUserId,
          approvalDecision: input.approvalDecision,
          rejectionReason: input.rejectionReason,
          rejectionExplanation: input.rejectionExplanation,
        })
        .onConflictDoUpdate({
          target: [submissionVotes.submissionId, submissionVotes.approverUserId],
          set: {
            approvalDecision: input.approvalDecision,
            rejectionReason: input.rejectionReason,
            rejectionExplanation: input.rejectionExplanation,
            updatedAt: new Date(),
          },
        })
        .returning()

      if (!vote) {
        throw new Error('Failed to persist vote')
      }
      return vote
    },

    async replaceVoteFilters(voteId, filters) {
      await tx
        .delete(submissionVoteFilters)
        .where(eq(submissionVoteFilters.voteId, voteId))

      if (filters.length > 0) {
        await tx.insert(submissionVoteFilters).values(
          filters.map((filter) => ({
            voteId,
            courseId: filter.courseId,
            mode: filter.mode,
            nubTier: filter.nubTier,
            proTier: filter.proTier,
            isRanked: filter.isRanked,
            notes: filter.notes,
          })),
        )
      }
    },

    async listVoteAttachments(voteId) {
      const rows = await tx
        .select()
        .from(submissionVoteAttachments)
        .where(eq(submissionVoteAttachments.voteId, voteId))
      return toRejectionAttachments(rows)
    },

    async replaceVoteAttachments(voteId, attachments) {
      await tx
        .delete(submissionVoteAttachments)
        .where(eq(submissionVoteAttachments.voteId, voteId))

      if (attachments.length > 0) {
        await tx.insert(submissionVoteAttachments).values(
          attachments.map((attachment) => ({ voteId, ...attachment })),
        )
      }
    },
  }
}