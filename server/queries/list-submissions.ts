import { and, count, desc, eq, inArray, notExists, type SQL } from 'drizzle-orm'

import { submissionCourses, submissionMappers, submissionVotes, submissions } from '~/db/schema'
import type { ReviewSubmissionRow } from '~/server/services/review-queue/review-queue'
import type { SubmissionStatus } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

export interface PageBounds {
  limit: number
  offset: number
}

/** Predicate for submissions the given approver has not voted on yet — the
 *  "Unvoted only" filter of the review queue. Uses a correlated NOT EXISTS so
 *  it composes with the status filter and the count query. */
function hasNoVoteFrom(userId: string): SQL {
  return notExists(
    db()
      .select({ id: submissionVotes.id })
      .from(submissionVotes)
      .where(and(
        eq(submissionVotes.submissionId, submissions.id),
        eq(submissionVotes.approverUserId, userId),
      )),
  )
}

/** One row of the "mine" submissions list: the submission's stored row (with
 *  timestamps serialised to ISO strings, as they cross HTTP/JSON) plus a
 *  computed vote count, so the client can hide the owner Edit/Delete actions
 *  as soon as review has started without an extra request. */
export type OwnSubmissionRow = Omit<
  (typeof submissions)['$inferSelect'],
  'createdAt' | 'updatedAt'
> & {
  createdAt: string
  updatedAt: string
  voteCount: number
}

export async function listOwnSubmissions(
  userId: string,
  status: SubmissionStatus | undefined,
  bounds?: PageBounds,
): Promise<OwnSubmissionRow[]> {
  const query = db()
    .select()
    .from(submissions)
    .where(
      status
        ? and(eq(submissions.createdByUserId, userId), eq(submissions.status, status))
        : eq(submissions.createdByUserId, userId),
    )
    .orderBy(desc(submissions.createdAt))

  if (bounds) {
    query.limit(bounds.limit).offset(bounds.offset)
  }
  const rows = await query

  if (rows.length === 0) {
    return []
  }

  const ids = rows.map((row) => row.id)
  const voteAgg = await db()
    .select({ submissionId: submissionVotes.submissionId, voteCount: count() })
    .from(submissionVotes)
    .where(inArray(submissionVotes.submissionId, ids))
    .groupBy(submissionVotes.submissionId)

  const voteCountBySub = new Map(
    voteAgg.map((vote) => [vote.submissionId, Number(vote.voteCount)]),
  )

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    voteCount: voteCountBySub.get(row.id) ?? 0,
  }))
}

export async function countOwnSubmissions(
  userId: string,
  status: SubmissionStatus | undefined,
) {
  const [row] = await db()
    .select({ value: count() })
    .from(submissions)
    .where(
      status
        ? and(eq(submissions.createdByUserId, userId), eq(submissions.status, status))
        : eq(submissions.createdByUserId, userId),
    )
  return Number(row?.value ?? 0)
}

export async function listAllSubmissions(status?: SubmissionStatus) {
  return db()
    .select()
    .from(submissions)
    .where(status ? eq(submissions.status, status) : undefined)
    .orderBy(desc(submissions.createdAt))
}

export async function countAllSubmissions(
  status: SubmissionStatus | undefined,
  unvotedOnly = false,
  userId?: string,
) {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(submissions.status, status))
  }
  if (unvotedOnly && userId) {
    conditions.push(hasNoVoteFrom(userId))
  }

  const [row] = await db()
    .select({ value: count() })
    .from(submissions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
  return Number(row?.value ?? 0)
}

export async function listAllSubmissionsForReview(
  status: SubmissionStatus | undefined,
  userId: string,
  bounds?: PageBounds,
  unvotedOnly = false,
): Promise<ReviewSubmissionRow[]> {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(submissions.status, status))
  }
  if (unvotedOnly) {
    conditions.push(hasNoVoteFrom(userId))
  }

  const query = db()
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      status === 'approved'
        ? desc(submissions.approvedAt)
        : desc(submissions.createdAt),
    )

  if (bounds?.limit !== undefined) {
    query.limit(bounds.limit)
  }
  if (bounds?.offset !== undefined) {
    query.offset(bounds.offset)
  }
  const rows = await query

  if (rows.length === 0) {
    return []
  }

  const ids = rows.map((row) => row.id)

  const [mappers, voteAgg, myVotes, courseAgg] = await Promise.all([
    db()
      .select({
        submissionId: submissionMappers.submissionId,
        displayNameSnapshot: submissionMappers.displayNameSnapshot,
      })
      .from(submissionMappers)
      .where(inArray(submissionMappers.submissionId, ids)),
    db()
      .select({
        submissionId: submissionVotes.submissionId,
        approvalDecision: submissionVotes.approvalDecision,
        voteCount: count(submissionVotes.id),
      })
      .from(submissionVotes)
      .where(inArray(submissionVotes.submissionId, ids))
      .groupBy(submissionVotes.submissionId, submissionVotes.approvalDecision),
    db()
      .select({
        submissionId: submissionVotes.submissionId,
        approvalDecision: submissionVotes.approvalDecision,
      })
      .from(submissionVotes)
      .where(and(
        inArray(submissionVotes.submissionId, ids),
        eq(submissionVotes.approverUserId, userId),
      )),
    db()
      .select({
        submissionId: submissionCourses.submissionId,
        courseCount: count(submissionCourses.id),
      })
      .from(submissionCourses)
      .where(inArray(submissionCourses.submissionId, ids))
      .groupBy(submissionCourses.submissionId),
  ])

  const mappersBySub = new Map<string, string[]>()
  for (const mapper of mappers) {
    if (!mappersBySub.has(mapper.submissionId)) {
      mappersBySub.set(mapper.submissionId, [])
    }
    mappersBySub.get(mapper.submissionId)!.push(mapper.displayNameSnapshot)
  }

  const voteCountBySub = new Map<string, { yes: number; no: number }>()
  for (const vote of voteAgg) {
    const counts = voteCountBySub.get(vote.submissionId) ?? { yes: 0, no: 0 }
    const decision = vote.approvalDecision
    if (decision === 'yes' || decision === 'no') {
      counts[decision] = Number(vote.voteCount)
      voteCountBySub.set(vote.submissionId, counts)
    }
  }

  const myVoteBySub = new Map<string, 'yes' | 'no'>()
  for (const vote of myVotes) {
    if (vote.approvalDecision === 'yes' || vote.approvalDecision === 'no') {
      myVoteBySub.set(vote.submissionId, vote.approvalDecision)
    }
  }

  const courseCountBySub = new Map(
    courseAgg.map((course) => [course.submissionId, Number(course.courseCount)]),
  )

  return rows.map((row) => ({
    id: row.id,
    mapName: row.mapName,
    workshopId: row.workshopId,
    workshopUrl: row.workshopUrl,
    courseCount: courseCountBySub.get(row.id) ?? 0,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    mappers: mappersBySub.get(row.id) ?? [],
    yesVotes: voteCountBySub.get(row.id)?.yes ?? 0,
    noVotes: voteCountBySub.get(row.id)?.no ?? 0,
    myVote: myVoteBySub.get(row.id) ?? null,
  }))
}
