import { createError, getRouterParam } from 'h3'

import { getApproverChecklist } from '~/server/services/approver-checklists/get-approver-checklist'
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

  return getApproverChecklist(submissionId, user.id)
})