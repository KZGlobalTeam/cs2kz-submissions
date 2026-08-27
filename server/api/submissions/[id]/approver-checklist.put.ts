import { createError, getRouterParam, readBody } from 'h3'
import { ZodError } from 'zod'

import { ApproverChecklistBodySchema } from '~/shared/schemas/approver-checklist'
import { saveApproverChecklist } from '~/server/services/approver-checklists/save-approver-checklist'
import { requireApproverRole } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireApproverRole(event)
  const submissionId = getRouterParam(event, 'id')

  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  let body: ReturnType<typeof ApproverChecklistBodySchema.parse>
  try {
    body = ApproverChecklistBodySchema.parse(await readBody(event))
  }
  catch (error) {
    if (error instanceof ZodError) {
      // A malformed body is the caller's mistake, not a server fault: fold
      // the zod issues into a 400 instead of letting the raw error surface
      // as a 500.
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid approver checklist body',
        data: error.issues,
      })
    }
    throw error
  }

  return saveApproverChecklist(submissionId, user.id, body)
})