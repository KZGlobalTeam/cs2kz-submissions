import { eq } from 'drizzle-orm'
import { createError } from 'h3'

import { submissionApproverChecklists, submissions } from '~/db/schema'
import type { ApproverChecklistInput } from '~/shared/schemas/approver-checklist'
import type { ApproverChecklistRow } from '~/shared/types/approver-checklist'

import { db } from '~/server/utils/db'

/**
 * Upserts the current user's own Approver checklist row for a submission,
 * keyed by the unique (submission, approver) pair — concurrent saves from
 * separate approvers can never collide. An empty checklist with a cleared
 * note persists as a real row (the "reset to nothing" save), distinct from
 * never having saved at all.
 */
export async function saveApproverChecklist(
  submissionId: string,
  approverUserId: string,
  input: ApproverChecklistInput,
): Promise<ApproverChecklistRow> {
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
    .insert(submissionApproverChecklists)
    .values({
      submissionId,
      approverUserId,
      checklist: input.checklist,
      note: input.note,
    })
    .onConflictDoUpdate({
      target: [
        submissionApproverChecklists.submissionId,
        submissionApproverChecklists.approverUserId,
      ],
      set: {
        checklist: input.checklist,
        note: input.note,
        updatedAt: new Date(),
      },
    })
    .returning()

  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to persist approver checklist',
    })
  }

  return {
    checklist: row.checklist,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}