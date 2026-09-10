import { describe, expect, it } from 'vitest'

import { gameValues } from '~/shared/schemas/game'

import {
  apiGamePath,
  coerceGame,
  gameLabels,
  gameOptions,
  gamePath,
  gameSwitchPath,
  isGameSegment,
} from '~/shared/utils/games'

describe('isGameSegment', () => {
  it('accepts exactly the two supported game segments', () => {
    for (const game of gameValues) {
      expect(isGameSegment(game)).toBe(true)
    }
  })

  it('rejects unknown, malformed, and non-string values', () => {
    expect(isGameSegment('kzt')).toBe(false)
    expect(isGameSegment('CS2')).toBe(false)
    expect(isGameSegment('')).toBe(false)
    expect(isGameSegment(undefined)).toBe(false)
    expect(isGameSegment(null)).toBe(false)
    expect(isGameSegment(42)).toBe(false)
    expect(isGameSegment(['cs2'])).toBe(false)
  })
})

describe('coerceGame', () => {
  it('resolves a valid segment to itself', () => {
    expect(coerceGame('csgo')).toBe('csgo')
  })

  it('falls back to cs2 by default, or to an explicit fallback', () => {
    expect(coerceGame(undefined)).toBe('cs2')
    expect(coerceGame('bogus')).toBe('cs2')
    expect(coerceGame(undefined, 'csgo')).toBe('csgo')
  })
})

describe('gameLabels and gameOptions', () => {
  it('labels every game exactly once, covering the switcher vocabulary', () => {
    expect(gameLabels).toEqual({ cs2: 'CS2', csgo: 'CS:GO' })
  })

  it('derives the switcher options from the shared game values', () => {
    expect(gameOptions).toEqual([
      { value: 'cs2', label: 'CS2' },
      { value: 'csgo', label: 'CS:GO' },
    ])
  })
})

describe('gamePath and apiGamePath', () => {
  it('prefixes page paths with the game segment', () => {
    expect(gamePath('cs2', '/submissions')).toBe('/cs2/submissions')
    expect(gamePath('csgo', '/submissions/abc/edit')).toBe('/csgo/submissions/abc/edit')
  })

  it('tolerates a missing leading slash', () => {
    expect(gamePath('cs2', 'review')).toBe('/cs2/review')
  })

  it('prefixes API paths under /api', () => {
    expect(apiGamePath('cs2', '/submissions')).toBe('/api/cs2/submissions')
    expect(apiGamePath('csgo', '/releases/7/export')).toBe('/api/csgo/releases/7/export')
  })
})

describe('gameSwitchPath', () => {
  it('re-scopes the same page to the target game, preserving the query', () => {
    expect(gameSwitchPath('csgo', '/cs2/submissions')).toEqual({
      path: '/csgo/submissions',
      preserveQuery: true,
    })
    expect(gameSwitchPath('cs2', '/csgo/review')).toEqual({
      path: '/cs2/review',
      preserveQuery: true,
    })
    expect(gameSwitchPath('csgo', '/cs2/submissions/abc')).toEqual({
      path: '/csgo/submissions/abc',
      preserveQuery: true,
    })
    expect(gameSwitchPath('csgo', '/cs2/releases/4/new-ish')).toEqual({
      path: '/csgo/releases/4/new-ish',
      preserveQuery: true,
    })
  })

  it('exits the edit page to the target game’s submissions overview, dropping the query', () => {
    expect(gameSwitchPath('csgo', '/cs2/submissions/abc/edit')).toEqual({
      path: '/csgo/submissions',
      preserveQuery: false,
    })
    expect(gameSwitchPath('cs2', '/csgo/submissions/123/edit')).toEqual({
      path: '/cs2/submissions',
      preserveQuery: false,
    })
  })

  it('maps the bare game landing correctly', () => {
    expect(gameSwitchPath('csgo', '/cs2')).toEqual({
      path: '/csgo',
      preserveQuery: true,
    })
  })

  it('keeps the query-preserving flag only for non-edit re-scoping', () => {
    expect(gameSwitchPath('csgo', '/cs2/review').preserveQuery).toBe(true)
    expect(gameSwitchPath('cs2', '/csgo/submissions/abc/edit').preserveQuery).toBe(false)
  })
})
