import { describe, expect, it } from 'vitest'

import { gamesMatch } from '~/server/utils/attach-game-match'

describe('gamesMatch', () => {
  it('matches a submission and release of the same game', () => {
    expect(gamesMatch('cs2', 'cs2')).toBe(true)
    expect(gamesMatch('csgo', 'csgo')).toBe(true)
  })

  it('rejects a cross-game attach in either direction', () => {
    expect(gamesMatch('cs2', 'csgo')).toBe(false)
    expect(gamesMatch('csgo', 'cs2')).toBe(false)
  })
})