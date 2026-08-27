import { createError, getRouterParam, readBody } from 'h3'

import { SubmissionVoteSchema } from '~/shared/schemas/review'
import { saveVote } from '~/server/services/votes/save-vote'
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

  const body = SubmissionVoteSchema.parse(await readBody(event))
  return saveVote(submissionId, user.id, body)
})