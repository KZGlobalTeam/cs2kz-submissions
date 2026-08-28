import { createError, getRouterParam, readBody } from 'h3'
import { ZodError } from 'zod'

import { LeadDecisionSchema } from '~/shared/schemas/review'
import { finalizeSubmission } from '~/server/services/review-write'
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

  let body: ReturnType<typeof LeadDecisionSchema.parse>
  try {
    body = LeadDecisionSchema.parse(await readBody(event))
  }
  catch (error) {
    if (error instanceof ZodError) {
      // Same contract as the vote path: the shared schema's rejection rules
      // (e.g. a whitespace-only Decision note on a rejection) are a caller
      // mistake — a 400 with the zod issues, not a 500.
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid decision body',
        data: error.issues,
      })
    }
    throw error
  }

  return finalizeSubmission(submissionId, user.id, body)
})