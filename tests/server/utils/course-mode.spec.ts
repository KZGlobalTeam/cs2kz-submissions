import { describe, expect, it } from 'vitest'

import {
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