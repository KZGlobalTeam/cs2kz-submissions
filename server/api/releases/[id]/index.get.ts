import { createError, getRouterParam } from 'h3'

import {
  findReleaseById,
  listReleaseSubmissions,
} from '~/server/queries/list-releases'
import { requireLeadApprover } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const releaseId = getRouterParam(event, 'id')
  if (!releaseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release id is required',
    })
  }

  const release = await findReleaseById(releaseId)
  if (!release) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Release not found',
    })
  }

  const submissions = await listReleaseSubmissions(releaseId)

  return { ...release, submissions }
})
