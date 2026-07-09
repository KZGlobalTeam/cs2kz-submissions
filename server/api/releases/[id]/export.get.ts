import { createError, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'

import { releases } from '~/db/schema'
import { buildReleaseExport } from '~/server/services/releases/build-export'
import { db } from '~/server/utils/db'
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

  const payload = await buildReleaseExport(releaseId)

  await db()
    .update(releases)
    .set({
      exportedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(releases.id, releaseId))

  return payload
})
