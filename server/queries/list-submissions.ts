import { and, count, desc, eq, inArray } from 'drizzle-orm'

import { submissionMappers, submissionVotes, submissions } from '~/db/schema'
import type { ReviewSubmissionRow, SubmissionStatus } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

export async function listOwnSubmissions(
  userId: string,
  status?: SubmissionStatus,
) {
  return db()
    .select()
    .from(submissions)
    .where(
      status
        ? and(eq(submissions.createdByUserId, userId), eq(submissions.status, status))
        : eq(submissions.createdByUserId, userId),
    )
    .orderBy(desc(submissions.createdAt))
}

export async function listAllSubmissions(status?: SubmissionStatus) {
  return db()
    .select()
    .from(submissions)
    .where(status ? eq(submissions.status, status) : undefined)
    .orderBy(desc(submissions.createdAt))
}

export async function listAllSubmissionsForReview(
  status: SubmissionStatus | undefined,
  userId: string,
): Promise<ReviewSubmissionRow[]> {
  const rows = await db()
    .select({
      id: submissions.id,
      mapName: submissions.mapName,
      workshopId: submissions.workshopId,
      workshopUrl: submissions.workshopUrl,
      status: submissions.status,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(status ? eq(submissions.status, status) : undefined)
    .orderBy(desc(submissions.createdAt))

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
    mappers: mappersBySub.get(row.id) ?? [],
    voteCount: voteCountBySub.get(row.id) ?? 0,
    myVote: myVoteSet.has(row.id),
  }))
}
