import { createError, getRouterParam } from 'h3'

import { buildReleaseDiscordMessage } from '~/server/services/releases/build-discord-message'
import { getAppConfig } from '~/server/utils/config'
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

  const config = getAppConfig(event)
  const message = await buildReleaseDiscordMessage(releaseId, game, {
    serverOperatorRoleId: game === 'cs2'
      ? config.discordCs2ServerOperatorRoleId
      : config.discordCsgoServerOperatorRoleId,
  })

  // Deliberately no `markReleaseExported`: only the JSON export records the
  // export (ADR-0008, ADR-0012). The announcement is side-effect free, like
  // the image pack.
  return { message }
})
