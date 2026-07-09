import { createRequire } from 'node:module'

import { createError } from 'h3'

const require = createRequire(import.meta.url)
const { RelyingParty } = require('openid') as typeof import('openid')

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid'
const STEAM_PROFILE_API = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/'

function createRelyingParty() {
  const realm = process.env.NUXT_STEAM_REALM
  const returnUrl = process.env.NUXT_STEAM_RETURN_URL

  if (!realm || !returnUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Steam auth environment variables are missing',
    })
  }

  return new RelyingParty(returnUrl, realm, true, false, [])
}

export async function getSteamLoginUrl() {
  const relyingParty = createRelyingParty()

  return new Promise<string>((resolve, reject) => {
    relyingParty.authenticate(STEAM_OPENID_URL, false, (error, authUrl) => {
      if (error || !authUrl) {
        reject(
          createError({
            statusCode: 500,
            statusMessage: 'Unable to initialize Steam login',
          }),
        )
        return
      }

      resolve(authUrl)
    })
  })
}

export async function verifySteamAssertion(requestUrl: string): Promise<string> {
  const relyingParty = createRelyingParty()

  const result = await new Promise<{ authenticated?: boolean; claimedIdentifier?: string }>(
    (resolve, reject) => {
      relyingParty.verifyAssertion(requestUrl, (error, verification) => {
        if (error) {
          reject(error)
          return
        }

        resolve(verification ?? {})
      })
    },
  )

  if (!result.authenticated || !result.claimedIdentifier) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Steam assertion verification failed',
    })
  }

  const steamId64 = result.claimedIdentifier.split('/').filter(Boolean).pop()
  if (!steamId64) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SteamID64 not found in assertion',
    })
  }

  return steamId64
}

export async function fetchSteamProfile(steamId64: string) {
  const apiKey = process.env.NUXT_STEAM_API_KEY
  if (!apiKey) {
    return {
      steamId64,
      personaName: steamId64,
      avatarUrl: null,
      profileUrl: `https://steamcommunity.com/profiles/${steamId64}`,
    }
  }

  const url = new URL(STEAM_PROFILE_API)
  url.searchParams.set('key', apiKey)
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
