import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'

import { submissionApproverChecklists, submissions } from '~/db/schema'
import type { ApproverChecklistRow } from '~/shared/types/approver-checklist'

import { db } from '~/server/utils/db'

/**
 * Reads the current user's own Approver checklist row for a submission.
 * Returns the row (with timestamps) when one exists, or `null` when the user
 * never saved anything — a reset-to-nothing save persists a real row, so
 * "never saved" and "reset to nothing" stay distinguishable. Scoped to the
 * caller's own (submission, approver) pair, so no other approver's data can
 * ever be read through this endpoint.
 */
export async function getApproverChecklist(
  submissionId: string,
  approverUserId: string,
): Promise<ApproverChecklistRow | null> {
  const [submission] = await db()
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  const [row] = await db()
    .select()
    .from(submissionApproverChecklists)
    .where(
      and(
        eq(submissionApproverChecklists.submissionId, submissionId),
        eq(submissionApproverChecklists.approverUserId, approverUserId),
      ),
    )
    .limit(1)

  if (!row) {
    return null
  }

  return {
    checklist: row.checklist,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}