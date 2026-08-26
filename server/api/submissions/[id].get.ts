import { createError, getRouterParam } from 'h3'

import { getSubmissionDetails } from '~/server/queries/submission-details'
import { canMutateSubmission } from '~/server/utils/submission-mutability'
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

  // Server-derived editable indicator for the owner. It must be computed
  // here, from the full vote list, because the votes payload is stripped
  // below for non-approvers — the edit page cannot infer the mutability
  // state from `votes` once it reaches the client. Only the creator may
  // edit, and only while pending with zero votes; any other viewer gets
  // `false`, and a vote landing after the list rendered flips it too.
  const isOwner = submission.submission.createdByUserId === user.id
  const editable =
    isOwner &&
    canMutateSubmission({
      status: submission.submission.status,
      voteCount: submission.votes.length,
    })

  // Mappers (submitters) and other non-approvers may only see the final
  // approved/rejected result, never individual approver votes. Strip the
  // votes payload for anyone without an approver role so it never reaches
  // the client, even via devtools.
  const isApprover =
    user.roles.includes('approver') || user.roles.includes('lead_approver')
  if (!isApprover) {
    submission.votes = []
  }

  return { ...submission, editable }
})