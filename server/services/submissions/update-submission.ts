import { count, eq } from 'drizzle-orm'
import { createError } from 'h3'

import { withTransaction } from '~/db/client'
import {
  submissionCourseMappers,
  submissionCourses,
  submissionMappers,
  submissionVotes,
  submissions,
} from '~/db/schema'
import { canMutateSubmission } from '~/server/utils/submission-mutability'
import { deleteStorageObjects } from '~/server/utils/storage'
import type { SubmissionInput } from '~/shared/types/submission'
import { assertWorkshopId } from '~/shared/utils/workshop'

/**
 * Replaces a submission's content wholesale, owner path: only the creator
 * may edit, and only while the submission is pending with zero votes. The
 * identification and mutability guards are re-checked **inside the
 * transaction** so a vote landing between page render and request still
 * fails the save. A non-creator receives the same opaque 404 as a missing
 * submission (no existence leak); a creator whose submission gained a vote
 * gets a 409 and nothing changes.
 *
 * The submission row is rewritten (workshop ID recomputed from the URL,
 * `created_at` preserved, `updated_at` bumped via the column's $onUpdate),
 * and the mapper and course rows — including per-course mappers — are
 * replaced wholesale, so added/removed/reordered courses and changed mappers
 * land in one request.
 *
 * After the save commits, stored images the new content no longer references
 * — replaced or removed course images and a replaced/removed
 * port-authorization image — are removed from storage best-effort; a storage
 * failure never fails the already-committed save.
 */
export async function updateSubmission(
  submissionId: string,
  ownerUserId: string,
  input: SubmissionInput,
) {
  const workshopId = assertWorkshopId(input.workshopUrl)
  let staleImageUrls: string[] = []

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

    // Collect the URLs of the images that exist right now, so any the saved
    // content no longer references can be removed from storage after commit.
    const oldCourses = await tx
      .select({ url: submissionCourses.imageUrl })
      .from(submissionCourses)
      .where(eq(submissionCourses.submissionId, submissionId))

    const oldUrls = [
      ...oldCourses.map((course) => course.url),
      ...(submission.portAuthorizationImageUrl
        ? [submission.portAuthorizationImageUrl]
        : []),
    ]
    const newUrls = [
      ...input.courses.map((course) => course.image.url),
      ...(input.isPort && input.portAuthorizationImage
        ? [input.portAuthorizationImage.url]
        : []),
    ]
    staleImageUrls = oldUrls.filter((url) => !newUrls.includes(url))

    await tx
      .update(submissions)
      .set({
        workshopUrl: input.workshopUrl,
        workshopId,
        mapName: input.mapName,
        notes: input.notes,
        isPort: input.isPort,
        portAuthorizationImageUrl: input.isPort ? input.portAuthorizationImage?.url ?? null : null,
        portAuthorizationImageMime: input.isPort ? input.portAuthorizationImage?.mime ?? null : null,
        portAuthorizationImageWidth: input.isPort ? input.portAuthorizationImage?.width ?? null : null,
        portAuthorizationImageHeight: input.isPort ? input.portAuthorizationImage?.height ?? null : null,
        portAuthorizationImageSizeBytes: input.isPort ? input.portAuthorizationImage?.sizeBytes ?? null : null,
        portNotes: input.isPort ? input.portNotes ?? null : null,
      })
      .where(eq(submissions.id, submissionId))

    await tx
      .delete(submissionMappers)
      .where(eq(submissionMappers.submissionId, submissionId))

    await tx.insert(submissionMappers).values(
      input.mappers.map((mapper) => ({
        submissionId,
        steamId64: mapper.steamId64,
        displayNameSnapshot: mapper.displayName,
      })),
    )

    // Deleting the course rows cascades their per-course mappers; the fresh
    // set is inserted with `orderIndex` from 1, so reordering is a replace.
    await tx
      .delete(submissionCourses)
      .where(eq(submissionCourses.submissionId, submissionId))

    for (const [index, course] of input.courses.entries()) {
      const [createdCourse] = await tx
        .insert(submissionCourses)
        .values({
          submissionId,
          orderIndex: index + 1,
          name: course.name,
          imageUrl: course.image.url,
          imageMime: course.image.mime,
          imageWidth: course.image.width,
          imageHeight: course.image.height,
          imageSizeBytes: course.image.sizeBytes,
        })
        .returning()

      if (!createdCourse) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update course',
        })
      }

      await tx.insert(submissionCourseMappers).values(
        course.mappers.map((mapper) => ({
          courseId: createdCourse.id,
          steamId64: mapper.steamId64,
          displayNameSnapshot: mapper.displayName,
        })),
      )
    }
  })

  await deleteStorageObjects(staleImageUrls)

  return { id: submissionId }
}