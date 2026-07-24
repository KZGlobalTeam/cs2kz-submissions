import { countDistinct, eq, inArray } from 'drizzle-orm'

import { userRoles, users } from '~/db/schema'
import { parsePagination } from '~/server/utils/pagination'
import { requireLeadApprover } from '~/server/utils/permissions'
import type { PaginatedResult } from '~/shared/types/pagination'

import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  const { page, pageSize, limit, offset } = parsePagination(event)

  const approverUsers = await db()
    .select({
      id: users.id,
      steamId64: users.steamId64,
      displayName: users.displayName,
    })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .groupBy(users.id)
    .orderBy(users.displayName)
    .limit(limit)
    .offset(offset)

  const userIds = approverUsers.map((user) => user.id)

  const roles =
    userIds.length > 0
      ? await db()
          .select({
            userId: userRoles.userId,
            role: userRoles.role,
          })
          .from(userRoles)
          .where(inArray(userRoles.userId, userIds))
      : []

  const rolesByUser = new Map<string, ('approver' | 'lead_approver')[]>()
  for (const { userId, role } of roles) {
    const existing = rolesByUser.get(userId) ?? []
    existing.push(role)
    rolesByUser.set(userId, existing)
  }

  const items = approverUsers.map((user) => ({
    id: user.id,
    steamId64: user.steamId64,
    displayName: user.displayName,
    roles: rolesByUser.get(user.id) ?? [],
  }))

  const [totalRow] = await db()
    .select({ value: countDistinct(userRoles.userId) })
    .from(userRoles)

  return {
    items,
    total: Number(totalRow?.value ?? 0),
    page,
    pageSize,
  } satisfies PaginatedResult<(typeof items)[number]>
})
