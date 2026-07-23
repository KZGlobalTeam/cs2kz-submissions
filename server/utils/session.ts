import { createHash, randomBytes } from 'node:crypto'

import { useRuntimeConfig } from '#imports'
import { eq } from 'drizzle-orm'
import {
  appendHeader,
  deleteCookie,
  getCookie,
  setCookie,
  type H3Event,
} from 'h3'

import { sessions } from '~/db/schema'

import { db } from './db'

const SESSION_COOKIE_NAME = 'cs2kz_submission_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

export function createSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function persistSession(event: H3Event, userId: string) {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db().insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  })

  const siteUrl = useRuntimeConfig().public.siteUrl as string
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: siteUrl.startsWith('https://'),
    expires: expiresAt,
    path: '/',
  })

  appendHeader(event, 'Cache-Control', 'no-store')
  return { expiresAt }
}

export function readSessionToken(event: H3Event): string | null {
  return getCookie(event, SESSION_COOKIE_NAME) ?? null
}

export async function destroySession(event: H3Event) {
  const token = readSessionToken(event)

  if (token) {
    await db()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)))
  }

  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/',
  })
}

export async function lookupSessionByToken(token: string) {
  const [session] = await db()
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(token)))
    .limit(1)

  if (!session || session.expiresAt <= new Date()) {
    return null
  }

  await db()
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, session.id))

  return session
}
