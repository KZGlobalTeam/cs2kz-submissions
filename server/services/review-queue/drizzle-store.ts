import { and, count, desc, eq, inArray, notExists, sql, type SQL } from 'drizzle-orm'

import { submissionCourses, submissionMappers, submissionVotes, submissions } from '~/db/schema'
import { db } from '~/server/utils/db'

import type { ResolvedFilters, ReviewReadStore } from './types'

/** Binds the `ReviewReadStore` contract to Drizzle over the HTTP database.
 *  The adapter stays thin SQL: predicates come from the resolved filters,
 *  the page ordering and window come from the bounds exactly as the module
 *  passed them, and all aggregation happens in the module. */
export function createDrizzleReviewReadStore(database = db()): ReviewReadStore {
  /** Predicate for submissions the given approver has not voted on yet — the
   *  "Unvoted only" filter of the review queue. Correlated NOT EXISTS so it
   *  composes with the status filter and the count query. */
  const hasNoVoteFrom = (userId: string): SQL =>
    notExists(
      database
        .select({ id: submissionVotes.id })
        .from(submissionVotes)
        .where(and(
          eq(submissionVotes.submissionId, submissions.id),
          eq(submissionVotes.approverUserId, userId),
        )),
    )

  /** Maps the resolved filters to `and(...)` conditions for list and count,
   *  so the two can never disagree about which rows match. */
  const conditions = (filters: ResolvedFilters): SQL | undefined => {
    const parts: SQL[] = []
    if (filters.status) {
      parts.push(eq(submissions.status, filters.status))
    }
    if (filters.ownerId) {
      parts.push(eq(submissions.createdByUserId, filters.ownerId))
    }
    if (filters.unvotedUserId) {
      parts.push(hasNoVoteFrom(filters.unvotedUserId))
    }
    return parts.length > 0 ? and(...parts) : undefined
  }

  return {
    async listSubmissionsPage(filters, bounds) {
      const query = database
        .select({
          id: submissions.id,
          mapName: submissions.mapName,
          workshopId: submissions.workshopId,
          workshopUrl: submissions.workshopUrl,
          status: submissions.status,
          createdAt: submissions.createdAt,
          approvedAt: submissions.approvedAt,
        })
        .from(submissions)
        .where(conditions(filters))

      // Ordering is a module decision passed as data (`bounds.orderBy`; issue
      // 01) — the adapter never picks the clock column itself. Nulls sort last
      // explicitly, so the SQL matches the fake's oracle exactly.
      if (bounds.orderBy === 'approvedAt') {
        query.orderBy(sql`${desc(submissions.approvedAt)} nulls last`)
      }
      else {
        query.orderBy(sql`${desc(submissions.createdAt)} nulls last`)
      }

      query.limit(bounds.limit).offset(bounds.offset)
      return query
    },

    async countSubmissions(filters) {
      const [row] = await database
        .select({ value: count() })
        .from(submissions)
        .where(conditions(filters))
      return Number(row?.value ?? 0)
    },

    async listMappers(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      return database
        .select({
          submissionId: submissionMappers.submissionId,
          displayNameSnapshot: submissionMappers.displayNameSnapshot,
        })
        .from(submissionMappers)
        .where(inArray(submissionMappers.submissionId, submissionIds))
    },

    async countVotesByDecision(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      const rows = await database
        .select({
          submissionId: submissionVotes.submissionId,
          approvalDecision: submissionVotes.approvalDecision,
          voteCount: count(submissionVotes.id),
        })
        .from(submissionVotes)
        .where(inArray(submissionVotes.submissionId, submissionIds))
        .groupBy(submissionVotes.submissionId, submissionVotes.approvalDecision)
      return rows.map((row) => ({
        submissionId: row.submissionId,
        approvalDecision: row.approvalDecision,
        voteCount: Number(row.voteCount),
      }))
    },

    async listMyVotes(submissionIds, userId) {
      if (submissionIds.length === 0) {
        return []
      }
      return database
        .select({
          submissionId: submissionVotes.submissionId,
          approvalDecision: submissionVotes.approvalDecision,
        })
        .from(submissionVotes)
        .where(and(
          inArray(submissionVotes.submissionId, submissionIds),
          eq(submissionVotes.approverUserId, userId),
        ))
    },

    async countCourses(submissionIds) {
      if (submissionIds.length === 0) {
        return []
      }
      const rows = await database
        .select({
          submissionId: submissionCourses.submissionId,
          courseCount: count(submissionCourses.id),
        })
        .from(submissionCourses)
        .where(inArray(submissionCourses.submissionId, submissionIds))
        .groupBy(submissionCourses.submissionId)
      return rows.map((row) => ({
        submissionId: row.submissionId,
        courseCount: Number(row.courseCount),
      }))
    },
  }
}