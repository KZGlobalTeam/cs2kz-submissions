import { createError, getRouterParam } from 'h3'

import { detachSubmissionFromRelease } from '~/server/services/releases/detach-submission'
import { requireLeadApprover } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const releaseId = getRouterParam(event, 'id')
  const submissionId = getRouterParam(event, 'submissionId')

  if (!releaseId || !submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release id and submission id are required',
    })
  }

  await detachSubmissionFromRelease(releaseId, submissionId)
  return { ok: true }
})
