import { createError, getRouterParam, readBody } from 'h3'

import { updateSubmission } from '~/server/services/submissions/update-submission'
import { SubmissionInputSchema } from '~/shared/schemas/submission'
import { requireAuth } from '~/server/utils/permissions'

/**
 * Owner edit endpoint. Accepts exactly the same validated shape as creation
 * (the shared `SubmissionInputSchema` from ticket 01), so the two write
 * paths cannot drift — including the port-evidence cross-field rules. The
 * service answers with an opaque 404 for non-creators and a 409 once review
 * has started, re-checked inside the write transaction.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const submissionId = getRouterParam(event, 'id')
  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  const body = SubmissionInputSchema.parse(await readBody(event))

  return updateSubmission(submissionId, user.id, body)
})