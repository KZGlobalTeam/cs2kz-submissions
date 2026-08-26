import { count, eq } from 'drizzle-orm'
import { createError } from 'h3'

import { withTransaction } from '~/db/client'
import {
  submissionCourses,
  submissionDecisionAttachments,
  submissionVoteAttachments,
  submissionVotes,
  submissions,
} from '~/db/schema'
import { canMutateSubmission } from '~/server/utils/submission-mutability'
import { deleteStorageObjects } from '~/server/utils/storage'

/**
 * Hard-deletes a submission. All related rows (mappers, courses, course
 * mappers, votes, vote filters, final filters, release links, attachments)
 * cascade on delete at the schema level, so removing the submission row is
 * enough.
 *
 * Pass `ownerUserId` for the owner path: only the creator may delete, and
 * only while the submission is pending with zero votes. The identification
 * and mutability guard are re-checked **inside the transaction** so a vote
 * landing between page render and request still fails the delete. A
 * non-creator receives the same opaque 404 as a missing submission (no
 * existence leak); a creator whose submission gained a vote gets a 409.
 * Without an owner the call is unrestricted (lead-approver path).
 *
 * After the delete commits, the submission's stored images — course images,
 * the port-authorization image, and any vote/decision attachment objects —
 * are removed from storage best-effort; a storage failure never fails the
 * delete itself.
 */
export async function deleteSubmission(
  submissionId: string,
  ownerUserId?: string,
): Promise<{ id: string }> {
  let imageUrls: string[] = []

  await withTransaction(async (tx) => {
    const [submission] = await tx
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

    if (ownerUserId) {
      // Opaque 404 for anyone who is not the creator.
      if (submission.createdByUserId !== ownerUserId) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Submission not found',
        })
      }

      const [votes] = await tx
        .select({ value: count() })
        .from(submissionVotes)
        .where(eq(submissionVotes.submissionId, submissionId))

      const voteCount = Number(votes?.value ?? 0)
      if (!canMutateSubmission({ status: submission.status, voteCount })) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Review has started',
        })
      }
    }

    // Collect the stored image URLs before the delete cascades them away.
    const [courses, voteAttachments, decisionAttachments] = await Promise.all([
      tx
        .select({ url: submissionCourses.imageUrl })
        .from(submissionCourses)
        .where(eq(submissionCourses.submissionId, submissionId)),
      tx
        .select({ url: submissionVoteAttachments.url })
        .from(submissionVoteAttachments)
        .innerJoin(submissionVotes, eq(submissionVoteAttachments.voteId, submissionVotes.id))
        .where(eq(submissionVotes.submissionId, submissionId)),
      tx
        .select({ url: submissionDecisionAttachments.url })
        .from(submissionDecisionAttachments)
        .where(eq(submissionDecisionAttachments.submissionId, submissionId)),
    ])

    imageUrls = [
      ...courses.map((course) => course.url),
      ...(submission.portAuthorizationImageUrl
        ? [submission.portAuthorizationImageUrl]
        : []),
      ...voteAttachments.map((attachment) => attachment.url),
      ...decisionAttachments.map((attachment) => attachment.url),
    ]

    await tx.delete(submissions).where(eq(submissions.id, submissionId))
  })

  await deleteStorageObjects(imageUrls)

  return { id: submissionId }
}