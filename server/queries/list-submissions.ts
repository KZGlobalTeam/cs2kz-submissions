import { and, desc, eq } from 'drizzle-orm'

import { submissions } from '~/db/schema'
import type { SubmissionStatus } from '~/shared/types/submission'

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
