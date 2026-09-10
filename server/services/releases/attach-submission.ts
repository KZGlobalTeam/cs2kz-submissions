import { eq } from 'drizzle-orm'
import { createError } from 'h3'

import { releases, releaseSubmissions, submissions } from '~/db/schema'
import { gamesMatch } from '~/server/utils/attach-game-match'
import { db } from '~/server/utils/db'

export async function attachSubmissionToRelease(
  releaseId: string,
  submissionId: string,
) {
  const [submission] = await db()
    .select({
      id: submissions.id,
      status: submissions.status,
      game: submissions.game,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  const [release] = await db()
    .select({ game: releases.game })
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1)

  if (!release) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Release not found',
    })
  }

  if (submission.status !== 'approved') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only approved submissions can be added to a release',
    })
  }

  // The release's own game is truth (the route is navigation, the row is
  // truth): a cross-game attach is a caller mistake, rejected with a 400
  // even when the request comes directly to the API (ADR-0016).
  if (!gamesMatch(submission.game, release.game)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission game does not match the release game',
    })
  }

  await db().insert(releaseSubmissions).values({
    releaseId,
    submissionId,
  })
}
