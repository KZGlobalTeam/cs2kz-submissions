import { createError } from 'h3'

import type {
  ReleaseContentsDeps,
  ReleaseContentsService,
  ReleaseCourseRow,
  ReleaseFinalFilter,
  ReleaseFinalFilterRow,
  ReleaseMapRow,
} from './types'

/** Maps in manifest order: `createdAt` ascending, `mapName` ascending as a
 *  deterministic tie-break — the rule defined once, shared by every artifact
 *  that renders a release. */
function orderMaps(maps: ReleaseMapRow[]): ReleaseMapRow[] {
  return [...maps].sort((a, b) => {
    const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime()
    if (byCreatedAt !== 0) {
      return byCreatedAt
    }
    return a.mapName < b.mapName ? -1 : a.mapName > b.mapName ? 1 : 0
  })
}

/** Courses in manifest order: raw `orderIndex` ascending. */
function orderCourses(courses: ReleaseCourseRow[]): ReleaseCourseRow[] {
  return [...courses].sort((a, b) => a.orderIndex - b.orderIndex)
}

/** The store row carries `courseId` for lookups; the manifest filters are
 *  pure finalized-filter facts — course identity already lives on the course. */
function stripCourseId(
  filter: ReleaseFinalFilterRow | null,
): ReleaseFinalFilter | null {
  if (!filter) {
    return null
  }
  return {
    mode: filter.mode,
    nubTier: filter.nubTier,
    proTier: filter.proTier,
    state: filter.state,
    notes: filter.notes,
  }
}

/** Binds the release-contents spine to a concrete store. Production wiring
 *  lives in `./index.ts`; the tests bind the in-memory fake. */
export function createReleaseContentsService(
  deps: ReleaseContentsDeps,
): ReleaseContentsService {
  return {
    /** Resolves a release's ordered manifest once: links → submissions →
     *  courses → mappers → finalized filters, one aggregation that every
     *  artifact renders from. Course mappers are keyed by course id, so that
     *  query runs in its own pass after the courses resolve.
     *
     *  Guards: an unknown release is a 404; any non-approved submission is a
     *  400 (a release containing a non-approved map is a data error). An
     *  empty release resolves to `maps: []` — whether that is an error is
     *  each artifact's call. */
    async resolve(releaseId) {
      const release = await deps.store.getRelease(releaseId)
      if (!release) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Release not found',
        })
      }

      const submissionIds = await deps.store.listLinkedSubmissionIds(releaseId)
      if (submissionIds.length === 0) {
        return { releaseName: release.name, maps: [] }
      }

      const [mapRows, courseRows, mapMappers, finalFilters] = await Promise.all(
        [
          deps.store.listMaps(submissionIds),
          deps.store.listCourses(submissionIds),
          deps.store.listMapMappers(submissionIds),
          deps.store.listFinalFilters(submissionIds),
        ],
      )

      const nonApproved = mapRows.find((map) => map.status !== 'approved')
      if (nonApproved) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Release contains non-approved submission',
        })
      }

      const courseIds = courseRows.map((course) => course.id)
      const courseMappers = courseIds.length
        ? await deps.store.listCourseMappers(courseIds)
        : []

      const maps = orderMaps(mapRows).map((map) => ({
        mapName: map.mapName,
        workshopId: map.workshopId,
        createdAt: map.createdAt,
        mappers: mapMappers
          .filter((mapper) => mapper.submissionId === map.id)
          .map((mapper) => mapper.steamId64),
        courses: orderCourses(
          courseRows.filter((course) => course.submissionId === map.id),
        ).map((course) => ({
          courseId: course.id,
          orderIndex: course.orderIndex,
          name: course.name,
          imageUrl: course.imageUrl,
          mappers: courseMappers
            .filter((mapper) => mapper.courseId === course.id)
            .map((mapper) => mapper.steamId64),
          filters: {
            classic: stripCourseId(
              finalFilters.find(
                (filter) =>
                  filter.courseId === course.id && filter.mode === 'classic',
              ) ?? null,
            ),
            vanilla: stripCourseId(
              finalFilters.find(
                (filter) =>
                  filter.courseId === course.id && filter.mode === 'vanilla',
              ) ?? null,
            ),
          },
        })),
      }))

      return { releaseName: release.name, maps }
    },

    /** Records the release as exported (ADR-0008: a read with a state-changing
     *  side effect, deliberately accepted). Owned by the module for locality,
     *  invoked only by the JSON export handler — the image pack never marks a
     *  release exported. */
    async markExported(releaseId) {
      await deps.store.markExported(releaseId)
    },
  }
}