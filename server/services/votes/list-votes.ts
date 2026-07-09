import { eq, inArray } from 'drizzle-orm'

import { submissionVoteFilters, submissionVotes, users } from '~/db/schema'

import { db } from '~/server/utils/db'

export async function listVotes(submissionId: string) {
  const votes = await db()
    .select({
      id: submissionVotes.id,
      approverUserId: submissionVotes.approverUserId,
      approvalDecision: submissionVotes.approvalDecision,
      rejectionReason: submissionVotes.rejectionReason,
      rejectionExplanation: submissionVotes.rejectionExplanation,
      createdAt: submissionVotes.createdAt,
      updatedAt: submissionVotes.updatedAt,
      approverName: users.displayName,
    })
    .from(submissionVotes)
    .innerJoin(users, eq(submissionVotes.approverUserId, users.id))
    .where(eq(submissionVotes.submissionId, submissionId))

  const voteIds = votes.map((vote) => vote.id)
  const filters = voteIds.length
    ? await db()
        .select()
        .from(submissionVoteFilters)
        .where(inArray(submissionVoteFilters.voteId, voteIds))
    : []

  return votes.map((vote) => ({
    ...vote,
    filters: filters.filter((filter) => filter.voteId === vote.id),
  }))
}
