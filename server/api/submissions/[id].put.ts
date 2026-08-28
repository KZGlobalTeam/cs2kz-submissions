import { createError, getRouterParam, readBody } from 'h3'
import { ZodError } from 'zod'

import { updateSubmission } from '~/server/services/submission-content'
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

  let body: ReturnType<typeof SubmissionInputSchema.parse>
  try {
    body = SubmissionInputSchema.parse(await readBody(event))
  }
  catch (error) {
    if (error instanceof ZodError) {
      // Same contract as the create endpoint: a malformed body — including
      // the workshop-URL rule the shared schema enforces — is the caller's
      // mistake, folded into a 400 (nothing written) instead of a raw 500.
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid submission body',
        data: error.issues,
      })
    }
    throw error
  }

  return updateSubmission(submissionId, user.id, body)
})