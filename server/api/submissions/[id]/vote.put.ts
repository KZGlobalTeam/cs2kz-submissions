import { createError, getRouterParam, readBody } from 'h3'
import { ZodError } from 'zod'

import { SubmissionVoteSchema } from '~/shared/schemas/review'
import { saveVote } from '~/server/services/review-write'
import { requireApprover } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireApprover(event)
  const submissionId = getRouterParam(event, 'id')

  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  let body: ReturnType<typeof SubmissionVoteSchema.parse>
  try {
    body = SubmissionVoteSchema.parse(await readBody(event))
  }
  catch (error) {
    if (error instanceof ZodError) {
      // A malformed body — including the rejection rules the shared schema
      // enforces (e.g. a whitespace-only Rejection reason) — is the caller's
      // mistake, not a server fault: fold the zod issues into a 400 instead
      // of letting the raw error surface as a 500.
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid vote body',
        data: error.issues,
      })
    }
    throw error
  }

  return saveVote(submissionId, user.id, body)
})