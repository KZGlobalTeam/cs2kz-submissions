import { createError, getRouterParam } from 'h3'

import { getSubmissionDetails } from '~/server/queries/submission-details'
import { requireAuth } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

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

  // Mappers (submitters) and other non-approvers may only see the final
  // approved/rejected result, never individual approver votes. Strip the
  // votes payload for anyone without an approver role so it never reaches
  // the client, even via devtools.
  const isApprover =
    user.roles.includes('approver') || user.roles.includes('lead_approver')
  if (!isApprover) {
    submission.votes = []
  }

  return submission
})
