import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'

import {
  submissionVoteAttachments,
  submissionVoteFilters,
  submissionVotes,
  submissions,
} from '~/db/schema'
import type { SubmissionVoteInput } from '~/shared/types/submission'

import { withTransaction } from '~/db/client'
import {
  REJECTION_ATTACHMENT_MESSAGES,
  REJECTION_ATTACHMENT_PREFIX,
  assessRejectionAttachments,
  computeAttachmentReplacement,
  toRejectionAttachments,
} from '~/server/utils/attachment-rules'
import { db } from '~/server/utils/db'
import {
  deleteStorageObjects,
  getBucketPublicBaseUrl,
} from '~/server/utils/storage'

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

  const verdict = assessRejectionAttachments({
    isRejection: input.approvalDecision === 'no',
    reason: input.rejectionReason,
    attachments: input.attachments,
    publicBaseUrl: getBucketPublicBaseUrl(),
    allowedPrefix: REJECTION_ATTACHMENT_PREFIX,
  })
  if (!verdict.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: REJECTION_ATTACHMENT_MESSAGES[verdict.reason],
    })
  }
  const incomingAttachments = verdict.attachments

  let removedAttachments: ReturnType<typeof computeAttachmentReplacement>['removed'] = []

  const vote = await withTransaction(async (tx) => {
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

    // Replace the stored attachment set wholesale (delete-and-insert). Any
    // URL that drops out has its storage object deleted after the commit.
    const storedRows = await tx
      .select()
      .from(submissionVoteAttachments)
      .where(eq(submissionVoteAttachments.voteId, vote.id))

    removedAttachments = computeAttachmentReplacement(
      toRejectionAttachments(storedRows),
      incomingAttachments,
    ).removed

    await tx
      .delete(submissionVoteAttachments)
      .where(eq(submissionVoteAttachments.voteId, vote.id))

    if (incomingAttachments.length) {
      await tx.insert(submissionVoteAttachments).values(
        incomingAttachments.map((attachment) => ({
          voteId: vote.id,
          ...attachment,
        })),
      )
    }

    return vote
  })

  // Storage objects for attachments that were removed by this save. Runs
  // after the rows are committed so a storage hiccup cannot fail the save.
  await deleteStorageObjects(
    removedAttachments.map((attachment) => attachment.url),
  )

  return vote
}