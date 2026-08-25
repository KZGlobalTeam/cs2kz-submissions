import { eq } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'

import { userRoles, users } from '~/db/schema'
import type { SessionUser } from '~/shared/types/submission'
import type { UserRole } from '~/shared/types/roles'

import { db } from './db'
import { lookupSessionByToken, readSessionToken } from './session'

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const rows = await db()
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))

  return rows.map((item) => item.role)
}

export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
  const token = readSessionToken(event)
  if (!token) {
    return null
  }

  const session = await lookupSessionByToken(token)
  if (!session) {
    return null
  }

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  if (!user) {
    return null
  }

  return {
    id: user.id,
    steamId64: user.steamId64,
    name: user.displayName,
    avatarUrl: user.avatarUrl,
    profileUrl: user.profileUrl,
    roles: await getUserRoles(user.id),
  }
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getCurrentUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  return user
}

export async function requireRole(
  event: H3Event,
  role: 'approver' | 'lead_approver',
) {
  const user = await requireUser(event)

  if (role === 'approver' && user.roles.includes('lead_approver')) {
    return user
  }

  if (!user.roles.includes(role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  return user
}
