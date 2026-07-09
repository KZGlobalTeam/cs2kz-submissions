import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'

import { userRoles, users } from '~/db/schema'
import { requireLeadApprover } from '~/server/utils/permissions'

import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const steamId64 = getRouterParam(event, 'steamId64')
  if (!steamId64) {
    throw createError({
      statusCode: 400,
      statusMessage: 'steamId64 is required',
    })
  }

  const role = getQuery(event).role
  if (role !== 'approver' && role !== 'lead_approver') {
    throw createError({
      statusCode: 400,
      statusMessage: 'role query parameter must be approver or lead_approver',
    })
  }

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.steamId64, steamId64))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  if (role === 'lead_approver') {
    const leads = await db()
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, 'lead_approver'))

    if (leads.length <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one lead approver must remain',
      })
    }
  }

  await db()
    .delete(userRoles)
    .where(and(eq(userRoles.userId, user.id), eq(userRoles.role, role)))

  return {
    ok: true,
  }
})
