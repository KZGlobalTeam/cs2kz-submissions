import { and, eq } from 'drizzle-orm'

import { releaseSubmissions } from '~/db/schema'
import { db } from '~/server/utils/db'

export async function detachSubmissionFromRelease(
  releaseId: string,
  submissionId: string,
) {
  await db()
    .delete(releaseSubmissions)
    .where(
      and(
        eq(releaseSubmissions.releaseId, releaseId),
        eq(releaseSubmissions.submissionId, submissionId),
      ),
    )
}
