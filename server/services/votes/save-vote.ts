import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'

import {
  submissionVoteFilters,
  submissionVotes,
  submissions,
} from '~/db/schema'
import type { SubmissionVoteInput } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

export async function saveVote(
  submissionId: string,
  approverUserId: string,
  input: SubmissionVoteInput,
) {
  const [submission] = await db()
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  if (submission.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending submissions can be voted on',
    })
  }

  return db().transaction(async (tx) => {
    const [existingVote] = await tx
      .select()
      .from(submissionVotes)
      .where(
        and(
          eq(submissionVotes.submissionId, submissionId),
          eq(submissionVotes.approverUserId, approverUserId),
        ),
      )
      .limit(1)

    const vote =
      existingVote
        ? (
            await tx
              .update(submissionVotes)
              .set({
                approvalDecision: input.approvalDecision,
                rejectionReason: input.rejectionReason,
                rejectionExplanation: input.rejectionExplanation,
                updatedAt: new Date(),
              })
              .where(eq(submissionVotes.id, existingVote.id))
              .returning()
          )[0]
        : (
            await tx
              .insert(submissionVotes)
              .values({
                submissionId,
                approverUserId,
                approvalDecision: input.approvalDecision,
                rejectionReason: input.rejectionReason,
                rejectionExplanation: input.rejectionExplanation,
              })
              .returning()
          )[0]

    if (!vote) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to persist vote',
      })
    }

    await tx
      .delete(submissionVoteFilters)
      .where(eq(submissionVoteFilters.voteId, vote.id))

    await tx.insert(submissionVoteFilters).values(
      input.filters.map((filter) => ({
        voteId: vote.id,
        courseId: filter.courseId,
        mode: filter.mode,
        nubTier: filter.nubTier,
        proTier: filter.proTier,
        isRanked: filter.isRanked,
        notes: filter.notes,
      })),
    )

    return vote
  })
}
