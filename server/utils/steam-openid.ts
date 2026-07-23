import { useRuntimeConfig } from '#imports'
import { createError } from 'h3'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_PROFILE_API = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/'

function getAuthConfig() {
  const { steamRealm, steamReturnUrl } = useRuntimeConfig()

  if (!steamRealm || !steamReturnUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Steam auth environment variables are missing',
    })
  }

  return { realm: String(steamRealm), returnUrl: String(steamReturnUrl) }
}

export async function getSteamLoginUrl() {
  const { realm, returnUrl } = getAuthConfig()

  const url = new URL(STEAM_OPENID_URL)
  url.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0')
  url.searchParams.set('openid.mode', 'checkid_setup')
  url.searchParams.set('openid.return_to', returnUrl)
  url.searchParams.set('openid.realm', realm)
  url.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select')
  url.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select')

  return url.toString()
}

export async function verifySteamAssertion(requestUrl: string): Promise<string> {
  const url = new URL(requestUrl)
  const params = new URLSearchParams(url.search)

  if (params.get('openid.mode') !== 'id_res') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid OpenID response mode',
    })
  }

  const claimedId = params.get('openid.claimed_id')
  if (!claimedId || !claimedId.startsWith('https://steamcommunity.com/openid/id/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Steam claimed id',
    })
  }

  const verifyParams = new URLSearchParams()
  for (const [key, value] of params) {
    if (key === 'openid.mode') {
      continue
    }
    verifyParams.append(key, value)
  }
  verifyParams.set('openid.mode', 'check_authentication')

  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to verify Steam assertion',
    })
  }

  // Steam returns a newline-separated key:value response, not a query string.
  const responseText = await response.text()
  const result = new Map<string, string>()
  for (const line of responseText.trim().split('\n')) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    result.set(key, value)
  }

  if (result.get('is_valid') !== 'true') {
    throw createError({
      statusCode: 401,
      statusMessage: 'Steam assertion verification failed',
    })
  }

  const steamId64 = claimedId.split('/').filter(Boolean).pop()
  if (!steamId64) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SteamID64 not found in assertion',
    })
  }

  return steamId64
}

export async function fetchSteamProfile(steamId64: string) {
  const { steamApiKey } = useRuntimeConfig()

  if (!steamApiKey) {
    return {
      steamId64,
      personaName: steamId64,
      avatarUrl: null,
      profileUrl: `https://steamcommunity.com/profiles/${steamId64}`,
    }
  }

  const url = new URL(STEAM_PROFILE_API)
  url.searchParams.set('key', String(steamApiKey))
  url.searchParams.set('steamids', steamId64)

  const response = await fetch(url)
  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Unable to fetch Steam profile',
    })
  }

  const payload = await response.json() as {
    response?: {
      players?: Array<{
        steamid: string
        personaname: string
        avatarfull?: string
        profileurl?: string
      }>
    }
  }

  const player = payload.response?.players?.[0]
  if (!player) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Steam profile not found',
    })
  }

  return {
    steamId64: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarfull ?? null,
    profileUrl: player.profileurl ?? `https://steamcommunity.com/profiles/${player.steamid}`,
  }
}
