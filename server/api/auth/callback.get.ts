import { eq } from 'drizzle-orm'
import { sendRedirect } from 'h3'

import { users } from '~/db/schema'
import { persistSession } from '~/server/utils/session'
import {
  fetchSteamProfile,
  verifySteamAssertion,
} from '~/server/utils/steam-openid'
import { steamId64ToSteamId } from '~/shared/utils/steam'

import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const steamId64 = await verifySteamAssertion(getRequestURL(event).toString())
  const steamProfile = await fetchSteamProfile(steamId64)
  const steamId = steamId64ToSteamId(steamId64)

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
        steamId,
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
        steamId,
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

  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return sendRedirect(event, `${siteUrl.replace(/\/$/, '')}/submissions`, 302)
})
