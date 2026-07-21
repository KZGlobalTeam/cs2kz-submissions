import { and, desc, eq } from 'drizzle-orm'

import { submissions } from '~/db/schema'
import type { SessionUser, SubmissionStatus } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

export async function listSubmissionsForUser(
  user: SessionUser,
  status?: SubmissionStatus,
) {
  const canReview =
    user.roles.includes('approver') || user.roles.includes('lead_approver')

  const query = db()
    .select()
    .from(submissions)
    .where(
      status
        ? canReview
          ? eq(submissions.status, status)
          : and(
              eq(submissions.createdByUserId, user.id),
              eq(submissions.status, status),
            )
        : canReview
          ? undefined
          : eq(submissions.createdByUserId, user.id),
    )
    .orderBy(desc(submissions.createdAt))

  return query
}
