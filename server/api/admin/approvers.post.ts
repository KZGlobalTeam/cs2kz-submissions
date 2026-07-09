import { and, eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { z } from 'zod'

import { userRoles, users } from '~/db/schema'
import { requireLeadApprover } from '~/server/utils/permissions'

import { db } from '../../utils/db'

const bodySchema = z.object({
  steamId64: z.string().min(1),
  role: z.enum(['approver', 'lead_approver']),
})

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  const body = bodySchema.parse(await readBody(event))

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.steamId64, body.steamId64))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found. The target user must login once before being granted a role.',
    })
  }

  const [existingRole] = await db()
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, user.id), eq(userRoles.role, body.role)))
    .limit(1)

  if (!existingRole) {
    await db().insert(userRoles).values({
      userId: user.id,
      role: body.role,
    })
  }

  return {
    ok: true,
  }
})
