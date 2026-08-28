import { createError, readBody } from 'h3'
import { ZodError } from 'zod'

import { createSubmission } from '~/server/services/submission-content'
import { SubmissionInputSchema } from '~/shared/schemas/submission'
import { requireAuth } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  let body: ReturnType<typeof SubmissionInputSchema.parse>
  try {
    body = SubmissionInputSchema.parse(await readBody(event))
  }
  catch (error) {
    if (error instanceof ZodError) {
      // A malformed body — including the workshop-URL rule the shared schema
      // enforces — is the caller's mistake, not a server fault: fold the zod
      // issues into a 400 (and write nothing) instead of a raw 500.
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid submission body',
        data: error.issues,
      })
    }
    throw error
  }

  return createSubmission(user.id, body)
})