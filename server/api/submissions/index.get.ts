import { getQuery } from 'h3'
import { z } from 'zod'

import { listSubmissionsForUser } from '~/server/queries/list-submissions'
import { requireAuth } from '~/server/utils/permissions'

const statusSchema = z.enum(['approved', 'rejected', 'pending'])

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const raw = getQuery(event).status
  const parsed = raw === undefined ? undefined : statusSchema.safeParse(raw)
  const status = parsed && parsed.success ? parsed.data : undefined
  return listSubmissionsForUser(user, status)
})
