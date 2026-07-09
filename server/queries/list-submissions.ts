import { desc, eq } from 'drizzle-orm'

import { submissions } from '~/db/schema'
import type { SessionUser } from '~/shared/types/submission'

import { db } from '~/server/utils/db'

export async function listSubmissionsForUser(user: SessionUser) {
  const canReview =
    user.roles.includes('approver') || user.roles.includes('lead_approver')

  const query = db()
    .select()
    .from(submissions)
    .orderBy(desc(submissions.createdAt))

  if (canReview) {
    return query
  }

  return query.where(eq(submissions.createdByUserId, user.id))
}
