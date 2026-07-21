import { eq, inArray } from 'drizzle-orm'

import {
  submissionCourseMappers,
  submissionCourses,
  submissionFinalFilters,
  submissionMappers,
  submissionVoteFilters,
  submissionVotes,
  submissions,
  users,
} from '~/db/schema'

import { db } from '~/server/utils/db'

export async function getSubmissionDetails(submissionId: string) {
  const [submission] = await db()
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) {
    return null
  }

  const [mappers, courses, votes, finalFilters] = await Promise.all([
    db().select().from(submissionMappers).where(eq(submissionMappers.submissionId, submissionId)),
    db()
      .select()
      .from(submissionCourses)
      .where(eq(submissionCourses.submissionId, submissionId)),
    db()
      .select({
        id: submissionVotes.id,
        submissionId: submissionVotes.submissionId,
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
      .where(eq(submissionVotes.submissionId, submissionId)),
    db()
      .select()
      .from(submissionFinalFilters)
      .where(eq(submissionFinalFilters.submissionId, submissionId)),
  ])

  const courseIds = courses.map((course) => course.id)
  const voteIds = votes.map((vote) => vote.id)

  const [courseMappers, voteFilters] = await Promise.all([
    courseIds.length
      ? db()
          .select()
          .from(submissionCourseMappers)
          .where(inArray(submissionCourseMappers.courseId, courseIds))
      : [],
    voteIds.length
      ? db()
          .select()
          .from(submissionVoteFilters)
          .where(inArray(submissionVoteFilters.voteId, voteIds))
      : [],
  ])

  const decisionByName = submission.decisionByUserId
    ? (await db()
        .select({ name: users.displayName })
        .from(users)
        .where(eq(users.id, submission.decisionByUserId))
        .limit(1))[0]?.name ?? null
    : null

  return {
    submission: {
      ...submission,
      decisionByName,
    },
    mappers,
    courses: courses.map((course) => ({
      ...course,
      mappers: courseMappers.filter((mapper) => mapper.courseId === course.id),
      finalFilters: finalFilters.filter((filter) => filter.courseId === course.id),
    })),
    votes: votes.map((vote) => ({
      ...vote,
      filters: voteFilters.filter((filter) => filter.voteId === vote.id),
    })),
  }
}
