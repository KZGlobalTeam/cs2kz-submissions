import { eq, inArray } from 'drizzle-orm'

import {
  releases,
  releaseSubmissions,
  submissionCourseMappers,
  submissionCourses,
  submissionFinalFilters,
  submissionMappers,
  submissions,
} from '~/db/schema'
import type { useDb } from '~/db/client'

import type { ReleaseContentsStore } from './types'

type Database = ReturnType<typeof useDb>

/** Binds the release-contents store contract to the Drizzle HTTP client. The
 *  store stays a dumb data accessor: no ordering, no guards — the resolution
 *  owns both, so its tests exercise the real contract against a fake store. */
export function drizzleStore(db: Database): ReleaseContentsStore {
  return {
    async getRelease(releaseId) {
      const [release] = await db
        .select({ name: releases.name })
        .from(releases)
        .where(eq(releases.id, releaseId))
        .limit(1)
      return release ? { name: release.name } : null
    },

    async listLinkedSubmissionIds(releaseId) {
      const links = await db
        .select({ submissionId: releaseSubmissions.submissionId })
        .from(releaseSubmissions)
        .where(eq(releaseSubmissions.releaseId, releaseId))
      return links.map((link) => link.submissionId)
    },

    async listMaps(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      return db
        .select({
          id: submissions.id,
          mapName: submissions.mapName,
          workshopId: submissions.workshopId,
          createdAt: submissions.createdAt,
          status: submissions.status,
        })
        .from(submissions)
        .where(inArray(submissions.id, submissionIds))
    },

    async listCourses(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      return db
        .select({
          id: submissionCourses.id,
          submissionId: submissionCourses.submissionId,
          orderIndex: submissionCourses.orderIndex,
          name: submissionCourses.name,
          imageUrl: submissionCourses.imageUrl,
        })
        .from(submissionCourses)
        .where(inArray(submissionCourses.submissionId, submissionIds))
    },

    async listMapMappers(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      return db
        .select({
          submissionId: submissionMappers.submissionId,
          steamId64: submissionMappers.steamId64,
        })
        .from(submissionMappers)
        .where(inArray(submissionMappers.submissionId, submissionIds))
    },

    async listCourseMappers(courseIds) {
      if (courseIds.length === 0) {
        return []
      }
      return db
        .select({
          courseId: submissionCourseMappers.courseId,
          steamId64: submissionCourseMappers.steamId64,
        })
        .from(submissionCourseMappers)
        .where(inArray(submissionCourseMappers.courseId, courseIds))
    },

    async listFinalFilters(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      return db
        .select({
          courseId: submissionFinalFilters.courseId,
          mode: submissionFinalFilters.mode,
          nubTier: submissionFinalFilters.nubTier,
          proTier: submissionFinalFilters.proTier,
          state: submissionFinalFilters.state,
          notes: submissionFinalFilters.notes,
        })
        .from(submissionFinalFilters)
        .where(inArray(submissionFinalFilters.submissionId, submissionIds))
    },

    async markExported(releaseId) {
      await db
        .update(releases)
        .set({
          exportedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(releases.id, releaseId))
    },
  }
}

export type {
  ReleaseCourseRow,
  ReleaseFinalFilterRow,
  ReleaseMapperRow,
  ReleaseMapRow,
  ReleaseRow,
} from './types'