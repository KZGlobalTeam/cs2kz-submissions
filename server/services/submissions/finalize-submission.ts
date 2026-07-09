import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'

import { submissionFinalFilters, submissions } from '~/db/schema'
import type { LeadDecisionInput } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

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

  return db().transaction(async (tx) => {
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
