import { eq } from 'drizzle-orm'

import { userRoles, users } from '~/db/schema'
import { requireLeadApprover } from '~/server/utils/permissions'

import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const rows = await db()
    .select({
      id: users.id,
      steamId64: users.steamId64,
      steamId: users.steamId,
      displayName: users.displayName,
      role: userRoles.role,
    })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))

  return rows
})
