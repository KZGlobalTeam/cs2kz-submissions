import { createError, getRouterParam } from 'h3'

import {
  findReleaseById,
  listReleaseSubmissions,
} from '~/server/queries/list-releases'
import { requireLeadApprover } from '~/server/utils/permissions'
import { requireRouteGame } from '~/server/utils/route-game'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  const game = requireRouteGame(event)

  const releaseId = getRouterParam(event, 'id')
  if (!releaseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release id is required',
    })
  }

  // The detail read is game-scoped: a release of another game reads as an
  // unknown release, so the page can never render another game's release.
  const release = await findReleaseById(releaseId, game)
  if (!release) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Release not found',
    })
  }

  const submissions = await listReleaseSubmissions(releaseId)

  return { ...release, submissions }
})
