import { describe, expect, it } from 'vitest'

import { steamId64ToSteamId, steamIdToSteamId64 } from '~/shared/utils/steam'

describe('steam id conversion', () => {
  it('converts steam id64 to steam id', () => {
    expect(steamId64ToSteamId('76561198282622073')).toBe('STEAM_1:1:161178172')
  })

  it('converts steam id to steam id64', () => {
    expect(steamIdToSteamId64('STEAM_1:1:161178172')).toBe('76561198282622073')
  })
})
