import { count, eq } from 'drizzle-orm'

import { userRoles, users } from '~/db/schema'
import { parsePagination } from '~/server/utils/pagination'
import { requireLeadApprover } from '~/server/utils/permissions'
import type { PaginatedResult } from '~/shared/types/pagination'

import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  const { page, pageSize, limit, offset } = parsePagination(event)

  const [rows, [totalRow]] = await Promise.all([
    db()
      .select({
        id: users.id,
        steamId64: users.steamId64,
        displayName: users.displayName,
        role: userRoles.role,
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .limit(limit)
      .offset(offset),
    db().select({ value: count() }).from(userRoles),
  ])

  return {
    items: rows,
    total: Number(totalRow?.value ?? 0),
    page,
    pageSize,
  } satisfies PaginatedResult<typeof rows[number]>
})
