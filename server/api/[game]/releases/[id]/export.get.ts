import { createError, getRouterParam } from 'h3'

import { buildReleaseExport } from '~/server/services/releases/build-export'
import { markReleaseExported } from '~/server/services/release-contents'
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

  // The resolution is game-scoped: a release of another game reads as a 404
  // before its export could be built or it could be marked exported.
  const payload = await buildReleaseExport(releaseId, game)

  // The export is the artifact that marks the release as exported (ADR-0008:
  // a read with a state-changing side effect, deliberately accepted). Only
  // the JSON export stamps it — the image pack download never does. A build
  // failure above (non-approved map, missing finalized filters) throws before
  // this write, so an invalid release is never marked exported.
  await markReleaseExported(releaseId)

  return payload
})