import { createError, getRouterParam } from 'h3'

import { getSubmissionDetails } from '~/server/queries/submission-details'
import { requireAuth } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const submissionId = getRouterParam(event, 'id')
  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  const submission = await getSubmissionDetails(submissionId)
  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  return submission
})
