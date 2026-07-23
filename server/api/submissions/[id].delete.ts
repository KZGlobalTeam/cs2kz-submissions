import { createError, getRouterParam } from 'h3'

import { deleteSubmission } from '~/server/services/submissions/delete-submission'
import { requireLeadApprover } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const submissionId = getRouterParam(event, 'id')
  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  return deleteSubmission(submissionId)
})
