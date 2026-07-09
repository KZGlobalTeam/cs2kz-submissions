import { eq } from 'drizzle-orm'
import { createError } from 'h3'

import { releaseSubmissions, submissions } from '~/db/schema'
import { db } from '~/server/utils/db'

export async function attachSubmissionToRelease(
  releaseId: string,
  submissionId: string,
) {
  const [submission] = await db()
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  if (submission.status !== 'approved') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only approved submissions can be added to a release',
    })
  }

  await db().insert(releaseSubmissions).values({
    releaseId,
    submissionId,
  })
}
