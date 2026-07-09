import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { attachSubmissionToRelease } from '~/server/services/releases/attach-submission'
import { requireLeadApprover } from '~/server/utils/permissions'

const bodySchema = z.object({
  submissionId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const releaseId = getRouterParam(event, 'id')
  if (!releaseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release id is required',
    })
  }

  const body = bodySchema.parse(await readBody(event))
  await attachSubmissionToRelease(releaseId, body.submissionId)

  return { ok: true }
})
