import { db } from '~/server/utils/db'
import type { SubmissionInput } from '~/shared/types/submission'
import { assertWorkshopId } from '~/shared/utils/workshop'
import { createError } from 'h3'
import {
  submissionCourseMappers,
  submissionCourses,
  submissionMappers,
  submissions,
} from '~/db/schema'

export async function createSubmission(
  createdByUserId: string,
  input: SubmissionInput,
) {
  const workshopId = assertWorkshopId(input.workshopUrl)

  return db().transaction(async (tx) => {
    const [submission] = await tx
      .insert(submissions)
      .values({
        createdByUserId,
        workshopUrl: input.workshopUrl,
        workshopId,
        mapName: input.mapName,
        notes: input.notes,
        status: 'pending',
      })
      .returning()

    if (!submission) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create submission',
      })
    }

    await tx.insert(submissionMappers).values(
      input.mappers.map((mapper) => ({
        submissionId: submission.id,
        steamId64: mapper.steamId64,
        steamId: mapper.steamId,
        displayNameSnapshot: mapper.displayName,
      })),
    )

    for (const [index, course] of input.courses.entries()) {
      const [createdCourse] = await tx
        .insert(submissionCourses)
        .values({
          submissionId: submission.id,
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
          statusMessage: 'Failed to create course',
        })
      }

      await tx.insert(submissionCourseMappers).values(
        course.mappers.map((mapper) => ({
          courseId: createdCourse.id,
          steamId64: mapper.steamId64,
          steamId: mapper.steamId,
          displayNameSnapshot: mapper.displayName,
        })),
      )
    }

    return submission
  })
}
