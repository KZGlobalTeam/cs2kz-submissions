import { eq } from 'drizzle-orm'
import {
  appendHeader,
  deleteCookie,
  getCookie,
  setCookie,
  type H3Event,
} from 'h3'

import { sessions } from '~/db/schema'

import { getAppConfig } from './config'
import { db } from './db'

const SESSION_COOKIE_NAME = 'cs2kz_submission_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

function bytesToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bytesToHex(bytes)
}

export async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

export async function persistSession(event: H3Event, userId: string) {
  const token = createSessionToken()
  const tokenHash = await hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db().insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  })

  const { siteUrl: siteUrlConfig } = getAppConfig(event)
  const siteUrl = siteUrlConfig ?? 'http://localhost:11451'
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
      .where(eq(sessions.tokenHash, await hashSessionToken(token)))
  }

  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/',
  })
}

export async function lookupSessionByToken(token: string) {
  const tokenHash = await hashSessionToken(token)
  const [session] = await db()
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
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
