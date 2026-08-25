import { asc, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'

import {
  releases,
  releaseSubmissions,
  submissionCourses,
  submissions,
} from '~/db/schema'
import { db } from '~/server/utils/db'
import type { ImagePackMap } from '~/server/utils/image-pack'

export interface ReleaseImagePackManifest {
  releaseName: string
  maps: ImagePackMap[]
}

/**
 * Resolves the ordered manifest backing a release's image pack:
 *
 * - release is looked up first — unknown id → 404;
 * - approved-only guard, mirroring the JSON export (a release containing a
 *   non-approved submission is a data error);
 * - maps ordered by submission `createdAt` ascending, with map name ascending
 *   as a deterministic tie-break;
 * - each map carries its courses ordered by raw `orderIndex`, with the name
 *   (for error messages) and the image URL.
 *
 * An empty release yields `maps: []` — the pack-builder turns that into a
 * clean 400 rather than producing an empty archive.
 */
export async function buildImagePackManifest(
  releaseId: string,
): Promise<ReleaseImagePackManifest> {
  const [release] = await db()
    .select({ name: releases.name })
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1)

  if (!release) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Release not found',
    })
  }

  const links = await db()
    .select({ submissionId: releaseSubmissions.submissionId })
    .from(releaseSubmissions)
    .where(eq(releaseSubmissions.releaseId, releaseId))

  const submissionIds = links.map((link) => link.submissionId)
  if (submissionIds.length === 0) {
    return { releaseName: release.name, maps: [] }
  }

  const [mapRows, courseRows] = await Promise.all([
    db()
      .select({
        id: submissions.id,
        mapName: submissions.mapName,
        createdAt: submissions.createdAt,
        status: submissions.status,
      })
      .from(submissions)
      .where(inArray(submissions.id, submissionIds)),
    db()
      .select({
        submissionId: submissionCourses.submissionId,
        orderIndex: submissionCourses.orderIndex,
        name: submissionCourses.name,
        imageUrl: submissionCourses.imageUrl,
      })
      .from(submissionCourses)
      .where(inArray(submissionCourses.submissionId, submissionIds))
      .orderBy(asc(submissionCourses.orderIndex)),
  ])

  for (const map of mapRows) {
    if (map.status !== 'approved') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Release contains non-approved submission',
      })
    }
  }

  const maps = [...mapRows]
    .sort((a, b) => {
      const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime()
      if (byCreatedAt !== 0) {
        return byCreatedAt
      }
      return a.mapName < b.mapName ? -1 : a.mapName > b.mapName ? 1 : 0
    })
    .map((map) => ({
      mapName: map.mapName,
      courses: courseRows
        .filter((course) => course.submissionId === map.id)
        .map((course) => ({
          orderIndex: course.orderIndex,
          name: course.name,
          imageUrl: course.imageUrl,
        })),
    }))

  return { releaseName: release.name, maps }
}