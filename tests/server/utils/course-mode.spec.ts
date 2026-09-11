import { describe, expect, it } from 'vitest'

import {
  finalFiltersForGame,
  firstModeOutsideGame,
  gameModeSets,
  modeLabel,
  modesForGame,
} from '~/shared/schemas/course-mode'

describe('modesForGame', () => {
  it("returns CS2's modes in render order — the vote form and lead panel seed exactly as today", () => {
    expect(modesForGame('cs2')).toEqual(['classic', 'vanilla'])
  })

  it("returns CS:GO's modes in render order", () => {
    expect(modesForGame('csgo')).toEqual(['kzt', 'skz', 'vnl'])
  })

  it('scopes every mode to exactly one game (CS2 vanilla and CS:GO vnl are different modes)', () => {
    const cs2 = modesForGame('cs2')
    for (const mode of modesForGame('csgo')) {
      expect(cs2).not.toContain(mode)
    }
  })
})

describe('finalFiltersForGame', () => {
  it("orders a CS:GO course's Finalized filters KZT, SKZ, VNL in vocabulary order, whatever the payload order", () => {
    const rows = [
      { mode: 'skz', nubTier: 'easy' },
      { mode: 'vnl', nubTier: 'medium' },
      { mode: 'kzt', nubTier: 'hard' },
    ] as const

    expect(finalFiltersForGame(rows, 'csgo').map((row) => row.mode)).toEqual([
      'kzt',
      'skz',
      'vnl',
    ])
  })

  it("keeps only the game's own modes — a stored out-of-game row never renders", () => {
    const rows = [
      { mode: 'classic' },
      { mode: 'kzt' },
      { mode: 'vanilla' },
      { mode: 'vnl' },
    ] as const

    expect(finalFiltersForGame(rows, 'csgo').map((row) => row.mode)).toEqual([
      'kzt',
      'vnl',
    ])
    expect(finalFiltersForGame(rows, 'cs2').map((row) => row.mode)).toEqual([
      'classic',
      'vanilla',
    ])
  })

  it('CS2 regression: classic then vanilla, exactly as the decided CS2 pages render today', () => {
    const rows = [{ mode: 'classic' }, { mode: 'vanilla' }] as const

    expect(finalFiltersForGame(rows, 'cs2').map((row) => row.mode)).toEqual([
      'classic',
      'vanilla',
    ])
  })

  it("keeps the first row of a duplicated mode (the schema's unique constraint forbids it; the view stays stable)", () => {
    const rows = [
      { mode: 'kzt', nubTier: 'easy' },
      { mode: 'kzt', nubTier: 'impossible' },
    ] as const

    expect(finalFiltersForGame(rows, 'csgo')).toEqual([
      { mode: 'kzt', nubTier: 'easy' },
    ])
  })

  it('an empty list stays empty for either game', () => {
    expect(finalFiltersForGame([], 'cs2')).toEqual([])
    expect(finalFiltersForGame([], 'csgo')).toEqual([])
  })
})

describe('firstModeOutsideGame', () => {
  it('returns null when every mode belongs to the game\'s set', () => {
    expect(firstModeOutsideGame(['classic', 'vanilla'], 'cs2')).toBeNull()
    expect(firstModeOutsideGame(['kzt', 'skz', 'vnl'], 'csgo')).toBeNull()
  })

  it('flags a CS:GO mode on a CS2 submission (and vice versa) — the pure verdict behind the write-path 400', () => {
    expect(firstModeOutsideGame(['classic', 'kzt'], 'cs2')).toBe('kzt')
    expect(firstModeOutsideGame(['classic'], 'csgo')).toBe('classic')
    expect(firstModeOutsideGame(['vnl'], 'cs2')).toBe('vnl')
  })

  it('reports the first offending mode of a mixed list', () => {
    expect(firstModeOutsideGame(['kzt', 'skz', 'classic', 'vanilla'], 'csgo')).toBe('classic')
  })

  it('an empty filter list is always in scope', () => {
    expect(firstModeOutsideGame([], 'cs2')).toBeNull()
    expect(firstModeOutsideGame([], 'csgo')).toBeNull()
  })
})

describe('modeLabel', () => {
  it('mirrors every vocabulary entry, so the label lookup cannot drift from the sets', () => {
    for (const entry of [...gameModeSets.cs2, ...gameModeSets.csgo]) {
      expect(modeLabel(entry.mode)).toBe(entry.label)
    }
  })

  it("labels CS2's modes CKZ and VNL, as rendered today", () => {
    expect(modeLabel('classic')).toBe('CKZ')
    expect(modeLabel('vanilla')).toBe('VNL')
  })

  it("labels CS:GO's modes KZT, SKZ, and VNL", () => {
    expect(modeLabel('kzt')).toBe('KZT')
    expect(modeLabel('skz')).toBe('SKZ')
    expect(modeLabel('vnl')).toBe('VNL')
  })
})