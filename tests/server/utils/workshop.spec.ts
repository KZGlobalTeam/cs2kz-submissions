import { describe, expect, it } from 'vitest'

import { assertWorkshopId, extractWorkshopId } from '~/shared/utils/workshop'

describe('assertWorkshopId', () => {
  it('derives the id from a strictly-valid workshop URL', () => {
    expect(
      assertWorkshopId('https://steamcommunity.com/sharedfiles/filedetails/?id=123456789'),
    ).toBe(123456789)
  })

  it('maps its unreachable failure to a 400, not a raw-Error 500', () => {
    // The shared wire schema's digit check admits ids that are not usable by
    // the derivation — one overflowing a safe integer, and a falsy 0 — the
    // only ways this failure can still fire after schema validation. Either
    // way it is a caller mistake and must surface as a 400, never as a raw
    // `Error` (500).
    for (const workshopUrl of [
      'https://steamcommunity.com/workshop/filedetails/?id=99999999999999999999999',
      'https://steamcommunity.com/sharedfiles/filedetails/?id=0',
    ]) {
      try {
        assertWorkshopId(workshopUrl)
        expect.unreachable('expected assertWorkshopId to throw')
      }
      catch (error) {
        expect(error).toMatchObject({ statusCode: 400 })
      }
    }
  })
})

describe('extractWorkshopId', () => {
  it('stays tolerant of legacy URL shapes', () => {
    expect(
      extractWorkshopId('https://steamcommunity.com/sharedfiles/filedetails/?id=123456789'),
    ).toBe(123456789)
    expect(extractWorkshopId('https://example.com/filedetails/?id=42')).toBe(42)
    expect(extractWorkshopId('https://example.com/maps/123456789/')).toBe(123456789)
    const legacyStoredUrl = 'https://steamcommunity.com/sharedfiles/filedetails/?id=9876543210'
    expect(extractWorkshopId(legacyStoredUrl)).toBe(9876543210)
  })

  it('returns null for URLs carrying no derivable id', () => {
    expect(extractWorkshopId('not a url')).toBeNull()
    expect(extractWorkshopId('https://example.com/')).toBeNull()
  })
})