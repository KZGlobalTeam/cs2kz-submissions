import { describe, expect, it } from 'vitest'

import {
  MAP_NAME_MAX_LENGTH,
  MAP_NAME_PREFIXES,
  mapNameBodyCharsetOk,
  mapNamePrefixListText,
  mapNamePrefixesForGame,
  mapNameWithinMaxLength,
  matchingMapNamePrefix,
} from '~/shared/utils/map-names'

describe('MAP_NAME_PREFIXES', () => {
  it('pins the per-game sets — CS2 is kz_-only, CS:GO takes the four mover namespaces', () => {
    expect(MAP_NAME_PREFIXES).toEqual({
      cs2: ['kz_'],
      csgo: ['kz_', 'skz_', 'vnl_', 'kzpro_'],
    })
  })

  it('pins the length cap at 27 characters for every name, whatever the prefix', () => {
    expect(MAP_NAME_MAX_LENGTH).toBe(27)
  })
})

describe('mapNamePrefixesForGame', () => {
  it('returns the pinned set per game', () => {
    expect(mapNamePrefixesForGame('cs2')).toBe(MAP_NAME_PREFIXES.cs2)
    expect(mapNamePrefixesForGame('csgo')).toBe(MAP_NAME_PREFIXES.csgo)
  })
})

describe('matchingMapNamePrefix', () => {
  it('finds the kz_ prefix on CS2', () => {
    expect(matchingMapNamePrefix('cs2', 'kz_my_map')).toBe('kz_')
  })

  it('finds each of the four CS:GO prefixes', () => {
    expect(matchingMapNamePrefix('csgo', 'kz_my_map')).toBe('kz_')
    expect(matchingMapNamePrefix('csgo', 'skz_my_map')).toBe('skz_')
    expect(matchingMapNamePrefix('csgo', 'vnl_my_map')).toBe('vnl_')
    expect(matchingMapNamePrefix('csgo', 'kzpro_my_map')).toBe('kzpro_')
  })

  it('rejects a foreign prefix', () => {
    expect(matchingMapNamePrefix('cs2', 'kjr_my_map')).toBeUndefined()
    expect(matchingMapNamePrefix('csgo', 'kjr_my_map')).toBeUndefined()
  })

  it('matches prefixes exactly — never case-insensitively', () => {
    expect(matchingMapNamePrefix('cs2', 'KZ_my_map')).toBeUndefined()
    expect(matchingMapNamePrefix('csgo', 'SKZ_my_map')).toBeUndefined()
    expect(matchingMapNamePrefix('csgo', 'VNL_my_map')).toBeUndefined()
    expect(matchingMapNamePrefix('csgo', 'KZPRO_my_map')).toBeUndefined()
  })

  it('has no prefix/substring ambiguity — kzpro_… does not match kz_', () => {
    expect(matchingMapNamePrefix('csgo', 'kzpro_my_map')).toBe('kzpro_')
  })

  it('still matches a bare prefix — the tail rule is the charset check’s job', () => {
    expect(matchingMapNamePrefix('cs2', 'kz_')).toBe('kz_')
  })
})

describe('mapNameBodyCharsetOk', () => {
  it('accepts ASCII alphanumerics and underscores', () => {
    expect(mapNameBodyCharsetOk('my_map')).toBe(true)
    expect(mapNameBodyCharsetOk('a1_B2')).toBe(true)
    expect(mapNameBodyCharsetOk('_')).toBe(true)
  })

  it('rejects an empty tail — a bare prefix is not a valid map name', () => {
    expect(mapNameBodyCharsetOk('')).toBe(false)
  })

  it('rejects non-alphanumeric characters — spaces, dashes, dots, non-ASCII', () => {
    expect(mapNameBodyCharsetOk('my map')).toBe(false)
    expect(mapNameBodyCharsetOk('my-map')).toBe(false)
    expect(mapNameBodyCharsetOk('my.map')).toBe(false)
    expect(mapNameBodyCharsetOk('mäp')).toBe(false)
  })
})

describe('mapNameWithinMaxLength', () => {
  it('accepts any name up to the pinned 27-char cap', () => {
    expect(mapNameWithinMaxLength('kz_' + 'a'.repeat(24))).toBe(true)
    expect(mapNameWithinMaxLength('kz_a')).toBe(true)
  })

  it('rejects a name over the cap, whatever the prefix', () => {
    expect(mapNameWithinMaxLength('kz_' + 'a'.repeat(25))).toBe(false)
  })
})

describe('mapNamePrefixListText', () => {
  it('renders the per-game prefix list for message composition', () => {
    expect(mapNamePrefixListText('cs2')).toBe('one of `kz_`')
    expect(mapNamePrefixListText('csgo')).toBe(
      'one of `kz_`, `skz_`, `vnl_`, `kzpro_`',
    )
  })
})