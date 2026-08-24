import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'

import {
  submissionDecisionAttachments,
  submissionFinalFilters,
  submissions,
} from '~/db/schema'
import type { LeadDecisionInput } from '~/shared/types/submission'

import { withTransaction } from '~/db/client'
import {
  REJECTION_ATTACHMENT_MESSAGES,
  REJECTION_ATTACHMENT_PREFIX,
  assessRejectionAttachments,
} from '~/server/utils/attachment-rules'
import { db } from '~/server/utils/db'
import { getBucketPublicBaseUrl } from '~/server/utils/storage'

export async function finalizeSubmission(
  submissionId: string,
  leadUserId: string,
  input: LeadDecisionInput,
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
      statusMessage: 'Only pending submissions can be finalized',
    })
  }

  const verdict = assessRejectionAttachments({
    isRejection: input.status === 'rejected',
    reason: input.decisionNotes,
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

  return withTransaction(async (tx) => {
    await tx
      .delete(submissionFinalFilters)
      .where(eq(submissionFinalFilters.submissionId, submissionId))

    if (input.status === 'approved') {
      await tx.insert(submissionFinalFilters).values(
        input.filters.map((filter) => ({
          submissionId,
          courseId: filter.courseId,
          mode: filter.mode,
          nubTier: filter.nubTier,
          proTier: filter.proTier,
          state: filter.state,
          isRanked: filter.isRanked,
          notes: filter.notes,
          resolvedByUserId: leadUserId,
        })),
      )
    }

    // Decision attachments are written once at finalize time and never
    // edited afterwards (finalization stays one-shot). Rows only exist for
    // rejected finalizations, so an approval leaks nothing to the mapper.
    if (input.status === 'rejected' && verdict.attachments.length) {
      await tx.insert(submissionDecisionAttachments).values(
        verdict.attachments.map((attachment) => ({
          submissionId,
          ...attachment,
        })),
      )
    }

    const [updated] = await tx
      .update(submissions)
      .set({
        status: input.status,
        decisionByUserId: leadUserId,
        decisionNotes: input.decisionNotes,
        approvedAt: input.status === 'approved' ? new Date() : null,
        rejectedAt: input.status === 'rejected' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, 'pending')))
      .returning()

    return updated
  })
}