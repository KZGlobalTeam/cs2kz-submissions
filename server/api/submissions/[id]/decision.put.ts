import { createError, getRouterParam, readBody } from 'h3'

import { LeadDecisionSchema } from '~/shared/schemas/review'
import { finalizeSubmission } from '~/server/services/submissions/finalize-submission'
import { requireLeadApprover } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireLeadApprover(event)
  const submissionId = getRouterParam(event, 'id')

  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  const body = LeadDecisionSchema.parse(await readBody(event))
  return finalizeSubmission(submissionId, user.id, body)
})