import { eq } from 'drizzle-orm'
import { sendRedirect } from 'h3'

import { users } from '~/db/schema'
import { getAppConfig } from '~/server/utils/config'
import { persistSession } from '~/server/utils/session'
import {
  fetchSteamProfile,
  verifySteamAssertion,
} from '~/server/utils/steam-openid'

import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const steamId64 = await verifySteamAssertion(getRequestURL(event).toString())
  const steamProfile = await fetchSteamProfile(steamId64, event)

  const [existingUser] = await db()
    .select()
    .from(users)
    .where(eq(users.steamId64, steamId64))
    .limit(1)

  let userId = existingUser?.id

  if (existingUser) {
    await db()
      .update(users)
      .set({
        displayName: steamProfile.personaName,
        avatarUrl: steamProfile.avatarUrl,
        profileUrl: steamProfile.profileUrl,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
  } else {
    const [createdUser] = await db()
      .insert(users)
      .values({
        steamId64,
        displayName: steamProfile.personaName,
        avatarUrl: steamProfile.avatarUrl,
        profileUrl: steamProfile.profileUrl,
      })
      .returning({ id: users.id })

    if (!createdUser) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to create user session',
      })
    }

    userId = createdUser.id
  }

  await persistSession(event, userId!)

  const { siteUrl } = getAppConfig(event)
  const redirectBase = siteUrl ?? 'http://localhost:3000'
  return sendRedirect(event, `${redirectBase.replace(/\/$/, '')}/submissions`, 302)
})
