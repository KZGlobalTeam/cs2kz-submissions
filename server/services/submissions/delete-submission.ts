import { eq } from 'drizzle-orm'
import { createError } from 'h3'

import { submissions } from '~/db/schema'

import { db } from '~/server/utils/db'

/**
 * Hard-deletes a submission. All related rows (mappers, courses, course
 * mappers, votes, vote filters, final filters, release links) cascade on
 * delete at the schema level, so removing the submission row is enough.
 */
export async function deleteSubmission(submissionId: string) {
  const [deleted] = await db()
    .delete(submissions)
    .where(eq(submissions.id, submissionId))
    .returning({ id: submissions.id })

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  return deleted
}
