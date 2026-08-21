import { eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'

import {
  releaseSubmissions,
  submissionCourseMappers,
  submissionCourses,
  submissionFinalFilters,
  submissionMappers,
  submissions,
} from '~/db/schema'
import { toReleaseExport } from '~/server/utils/export-release'

import { db } from '~/server/utils/db'

export async function buildReleaseExport(releaseId: string) {
  const releaseItems = await db()
    .select({ submissionId: releaseSubmissions.submissionId })
    .from(releaseSubmissions)
    .where(eq(releaseSubmissions.releaseId, releaseId))

  const submissionIds = releaseItems.map((item) => item.submissionId)
  if (!submissionIds.length) {
    return []
  }

  const [releaseMaps, mapMappers, courses, finalFilters] = await Promise.all([
    db()
      .select()
      .from(submissions)
      .where(inArray(submissions.id, submissionIds)),
    db()
      .select()
      .from(submissionMappers)
      .where(inArray(submissionMappers.submissionId, submissionIds)),
    db()
      .select()
      .from(submissionCourses)
      .where(inArray(submissionCourses.submissionId, submissionIds)),
    db()
      .select()
      .from(submissionFinalFilters)
      .where(inArray(submissionFinalFilters.submissionId, submissionIds)),
  ])

  const courseIds = courses.map((course) => course.id)
  const courseMappers = courseIds.length
    ? await db()
        .select()
        .from(submissionCourseMappers)
        .where(inArray(submissionCourseMappers.courseId, courseIds))
    : []

  return toReleaseExport(
    releaseMaps.map((submission) => {
      if (submission.status !== 'approved') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Release contains non-approved submission',
        })
      }

      return {
        name: submission.mapName,
        workshopId: submission.workshopId,
        mappers: mapMappers
          .filter((mapper) => mapper.submissionId === submission.id)
          .map((mapper) => mapper.steamId64),
        courses: courses
          .filter((course) => course.submissionId === submission.id)
          .map((course) => {
            const filtersForCourse = finalFilters.filter(
              (filter) => filter.courseId === course.id,
            )
            const classic = filtersForCourse.find((filter) => filter.mode === 'classic')
            const vanilla = filtersForCourse.find((filter) => filter.mode === 'vanilla')

            if (!classic || !vanilla) {
              throw createError({
                statusCode: 400,
                statusMessage: `Missing finalized filters for course ${course.name}`,
              })
            }

            return {
              name: course.name,
              filters: {
                classic: {
                  nub_tier: classic.nubTier,
                  pro_tier: classic.proTier,
                  state: classic.state,
                  notes: classic.notes ?? '',
                },
                vanilla: {
                  nub_tier: vanilla.nubTier,
                  pro_tier: vanilla.proTier,
                  state: vanilla.state,
                  notes: vanilla.notes ?? '',
                },
              },
              mappers: courseMappers
                .filter((mapper) => mapper.courseId === course.id)
                .map((mapper) => mapper.steamId64),
            }
          }),
      }
    }),
  )
}
