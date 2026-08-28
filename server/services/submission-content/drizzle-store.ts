import { and, count, eq } from 'drizzle-orm'

import type { TransactionClient } from '~/db/client'
import {
  submissionCourseMappers,
  submissionCourses,
  submissionDecisionAttachments,
  submissionMappers,
  submissionVoteAttachments,
  submissionVotes,
  submissions,
} from '~/db/schema'

import type {
  SubmissionContentStore,
  SubmissionContentWrite,
  SubmissionCourseWrite,
} from './types'

/** Binds the submission-content store contract to a Drizzle transaction
 *  client. */
export function transactionStore(tx: TransactionClient): SubmissionContentStore {
  return {
    async getSubmission(submissionId) {
      const [row] = await tx
        .select({
          id: submissions.id,
          status: submissions.status,
          createdByUserId: submissions.createdByUserId,
          portAuthorizationImageUrl: submissions.portAuthorizationImageUrl,
        })
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1)
      return row ?? null
    },

    async countVotes(submissionId) {
      const [votes] = await tx
        .select({ value: count() })
        .from(submissionVotes)
        .where(eq(submissionVotes.submissionId, submissionId))
      return Number(votes?.value ?? 0)
    },

    async createSubmission(createdByUserId, content: SubmissionContentWrite) {
      const [row] = await tx
        .insert(submissions)
        .values({
          createdByUserId,
          ...content,
          status: 'pending',
        })
        .returning()

      if (!row) {
        throw new Error('Failed to create submission')
      }
      return row
    },

    async updateSubmissionContent(
      submissionId,
      content: SubmissionContentWrite,
    ) {
      // The belt-and-braces guard: the update can only match while the row
      // is still `pending`, so a zero-row result means the submission moved
      // between the spine's in-transaction re-read and this write — the
      // caller surfaces that as a 409 and the throw rolls the write back.
      const [row] = await tx
        .update(submissions)
        .set({
          ...content,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(submissions.id, submissionId),
            eq(submissions.status, 'pending'),
          ),
        )
        .returning({
          id: submissions.id,
          status: submissions.status,
          createdByUserId: submissions.createdByUserId,
          portAuthorizationImageUrl: submissions.portAuthorizationImageUrl,
        })

      return row ?? null
    },

    async replaceMappers(submissionId, mappers) {
      await tx
        .delete(submissionMappers)
        .where(eq(submissionMappers.submissionId, submissionId))

      await tx.insert(submissionMappers).values(
        mappers.map((mapper) => ({
          submissionId,
          steamId64: mapper.steamId64,
          displayNameSnapshot: mapper.displayNameSnapshot,
        })),
      )
    },

    async replaceCourses(submissionId, courses: SubmissionCourseWrite[]) {
      // Deleting the course rows cascades their per-course mappers; the
      // fresh set is inserted with `orderIndex` from 1, so reordering is a
      // replace.
      await tx
        .delete(submissionCourses)
        .where(eq(submissionCourses.submissionId, submissionId))

      for (const course of courses) {
        const [created] = await tx
          .insert(submissionCourses)
          .values({
            submissionId,
            orderIndex: course.orderIndex,
            name: course.name,
            imageUrl: course.imageUrl,
            imageMime: course.imageMime,
            imageWidth: course.imageWidth,
            imageHeight: course.imageHeight,
            imageSizeBytes: course.imageSizeBytes,
          })
          .returning()

        if (!created) {
          throw new Error('Failed to create course')
        }

        await tx.insert(submissionCourseMappers).values(
          course.mappers.map((mapper) => ({
            courseId: created.id,
            steamId64: mapper.steamId64,
            displayNameSnapshot: mapper.displayNameSnapshot,
          })),
        )
      }
    },

    async listSubmissionImageUrls(submissionId) {
      const [courses, row] = await Promise.all([
        tx
          .select({ url: submissionCourses.imageUrl })
          .from(submissionCourses)
          .where(eq(submissionCourses.submissionId, submissionId)),
        tx
          .select({ url: submissions.portAuthorizationImageUrl })
          .from(submissions)
          .where(eq(submissions.id, submissionId))
          .limit(1),
      ])

      return [
        ...courses.map((course) => course.url),
        ...(row[0]?.url ? [row[0].url] : []),
      ]
    },

    async listSubmissionAttachmentUrls(submissionId) {
      const [voteAttachments, decisionAttachments] = await Promise.all([
        tx
          .select({ url: submissionVoteAttachments.url })
          .from(submissionVoteAttachments)
          .innerJoin(
            submissionVotes,
            eq(submissionVoteAttachments.voteId, submissionVotes.id),
          )
          .where(eq(submissionVotes.submissionId, submissionId)),
        tx
          .select({ url: submissionDecisionAttachments.url })
          .from(submissionDecisionAttachments)
          .where(eq(submissionDecisionAttachments.submissionId, submissionId)),
      ])

      return [
        ...voteAttachments.map((attachment) => attachment.url),
        ...decisionAttachments.map((attachment) => attachment.url),
      ]
    },

    async deleteSubmissionRow(submissionId) {
      await tx.delete(submissions).where(eq(submissions.id, submissionId))
    },
  }
}