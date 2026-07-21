import { describe, expect, it } from 'vitest'

import { assertWorkshopId, extractWorkshopId } from '~/shared/utils/workshop'

describe('workshop url parsing', () => {
  it('extracts id from a steam workshop url', () => {
    expect(
      extractWorkshopId('https://steamcommunity.com/sharedfiles/filedetails/?id=123456'),
    ).toBe(123456)
  })

  it('extracts large workshop ids that exceed 32-bit integer range', () => {
    expect(
      extractWorkshopId('https://steamcommunity.com/sharedfiles/filedetails/?id=3745801456'),
    ).toBe(3745801456)
  })

  it('throws for invalid urls', () => {
    expect(() => assertWorkshopId('https://example.com')).toThrowError()
  })
})
