import { and, count, desc, eq, inArray } from 'drizzle-orm'

import { submissionMappers, submissionVotes, submissions } from '~/db/schema'
import type { ReviewSubmissionRow, SubmissionStatus } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

export interface PageBounds {
  limit: number
  offset: number
}

export async function listOwnSubmissions(
  userId: string,
  status: SubmissionStatus | undefined,
  bounds?: PageBounds,
) {
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
  return query
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

export async function countAllSubmissions(status: SubmissionStatus | undefined) {
  const [row] = await db()
    .select({ value: count() })
    .from(submissions)
    .where(status ? eq(submissions.status, status) : undefined)
  return Number(row?.value ?? 0)
}

export async function listAllSubmissionsForReview(
  status: SubmissionStatus | undefined,
  userId: string,
  bounds?: PageBounds,
): Promise<ReviewSubmissionRow[]> {
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
    .where(status ? eq(submissions.status, status) : undefined)
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

  const [mappers, voteAgg, myVotes] = await Promise.all([
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
        voteCount: count(submissionVotes.id),
      })
      .from(submissionVotes)
      .where(inArray(submissionVotes.submissionId, ids))
      .groupBy(submissionVotes.submissionId),
    db()
      .select({ submissionId: submissionVotes.submissionId })
      .from(submissionVotes)
      .where(and(
        inArray(submissionVotes.submissionId, ids),
        eq(submissionVotes.approverUserId, userId),
      )),
  ])

  const mappersBySub = new Map<string, string[]>()
  for (const mapper of mappers) {
    if (!mappersBySub.has(mapper.submissionId)) {
      mappersBySub.set(mapper.submissionId, [])
    }
    mappersBySub.get(mapper.submissionId)!.push(mapper.displayNameSnapshot)
  }

  const voteCountBySub = new Map<string, number>()
  for (const vote of voteAgg) {
    voteCountBySub.set(vote.submissionId, Number(vote.voteCount))
  }

  const myVoteSet = new Set(myVotes.map((vote) => vote.submissionId))

  return rows.map((row) => ({
    id: row.id,
    mapName: row.mapName,
    workshopId: row.workshopId,
    workshopUrl: row.workshopUrl,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    mappers: mappersBySub.get(row.id) ?? [],
    voteCount: voteCountBySub.get(row.id) ?? 0,
    myVote: myVoteSet.has(row.id),
  }))
}
