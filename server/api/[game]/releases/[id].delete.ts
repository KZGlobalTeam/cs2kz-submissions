import { createError, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'

import { releases } from '~/db/schema'
import { db } from '~/server/utils/db'
import { requireLeadApprover } from '~/server/utils/permissions'
import { requireRouteGame } from '~/server/utils/route-game'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  requireRouteGame(event)

  const releaseId = getRouterParam(event, 'id')
  if (!releaseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release id is required',
    })
  }

  await db().delete(releases).where(eq(releases.id, releaseId))
  return { ok: true }
})
