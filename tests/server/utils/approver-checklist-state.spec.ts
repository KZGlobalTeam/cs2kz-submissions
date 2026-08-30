import { describe, expect, it } from 'vitest'

import { submissionRulesSteps } from '~/components/submission/submissionRules'
import type { ApproverChecklist } from '~/components/review/approver-checklist-storage'
import {
  buildChecklistPayload,
  hasSavedContent,
  normalizeNote,
  seedChecklistGroups,
  visibleRuleGroups,
} from '~/components/review/approver-checklist-state'

const allGroups = submissionRulesSteps
const nonPortGroups = visibleRuleGroups(allGroups, false)
const portGroups = visibleRuleGroups(allGroups, true)

describe('visibleRuleGroups', () => {
  it('shows every group except porting when the submission is not a port', () => {
    expect(nonPortGroups.map((group) => group.key)).toEqual([
      'naming',
      'courses',
      'ranked',
      'jumpstat',
      'other',
    ])
  })

  it('includes the porting group when the submission is a port', () => {
    expect(portGroups.map((group) => group.key)).toEqual([
      'naming',
      'courses',
      'ranked',
      'jumpstat',
      'porting',
      'other',
    ])
  })

  it('does not reorder or duplicate groups', () => {
    expect(portGroups).toEqual(allGroups)
  })
})

describe('seedChecklistGroups', () => {
  it('seeds every rendered group unchecked for a never-saved approver', () => {
    const state = seedChecklistGroups(nonPortGroups, null)
    for (const group of nonPortGroups) {
      expect(state[group.key]).toEqual(group.rules.map(() => false))
    }
    expect(state).not.toHaveProperty('porting')
  })

  it('preserves saved ticks per rule index', () => {
    const saved = { naming: [true, false, true], other: [true] }
    const state = seedChecklistGroups(portGroups, saved)
    expect(state.naming).toEqual([true, false, true, false, false, false])
    expect(state.other).toEqual([true, false, false])
    expect(state.courses?.every((tick) => tick === false)).toBe(true)
  })

  it('pads a saved group shorter than the current rule set with false', () => {
    // A rule was added since the last save: the new rule starts unchecked.
    const state = seedChecklistGroups(nonPortGroups, { ranked: [true] })
    expect(state.ranked).toEqual([true, false, false, false])
  })

  it('drops saved ticks beyond the current rule set', () => {
    const state = seedChecklistGroups(nonPortGroups, { other: [true, true, true, true] })
    expect(state.other).toEqual([true, true, true])
  })

  it('ignores saved keys for groups that are not rendered', () => {
    // A saved porting group is not rendered for a non-port submission.
    const state = seedChecklistGroups(nonPortGroups, { porting: [true, false] })
    expect(state).not.toHaveProperty('porting')
  })
})

describe('normalizeNote', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeNote('  port looks clean  ')).toBe('port looks clean')
  })

  it('normalizes empty and whitespace-only notes to null', () => {
    for (const note of ['', '   ', '\t\r\n  ']) {
      expect(normalizeNote(note)).toBeNull()
    }
  })

  it('keeps a normal note unchanged', () => {
    expect(normalizeNote('Jumpstat blocks look consistent')).toBe(
      'Jumpstat blocks look consistent',
    )
  })
})

describe('hasSavedContent', () => {
  it('is false when nothing was ever saved (key absent)', () => {
    expect(hasSavedContent(null, null)).toBe(false)
    expect(hasSavedContent(undefined, undefined)).toBe(false)
  })

  it('is false for an empty checklist with no note', () => {
    expect(hasSavedContent({}, null)).toBe(false)
  })

  it('is false for a reset-to-nothing state: all unchecked and note cleared', () => {
    // A reset-to-nothing save removes the key, so read-only it renders
    // exactly like never-saved — never an empty box.
    expect(hasSavedContent({ naming: [false, false, false], other: [false] }, null)).toBe(false)
  })

  it('is true when at least one rule is ticked', () => {
    expect(hasSavedContent({ naming: [false, true, false] }, null)).toBe(true)
  })

  it('is true when a note is present even with no ticks', () => {
    expect(hasSavedContent({ naming: [false], other: [false] }, 'check the jumpstat blocks')).toBe(true)
  })

  it('treats an empty or whitespace-only note as no content', () => {
    expect(hasSavedContent({}, '')).toBe(false)
    expect(hasSavedContent({}, '   ')).toBe(false)
  })
})

describe('buildChecklistPayload', () => {
  it('builds a payload with normalized ticks and a trimmed note', () => {
    const payload = buildChecklistPayload(
      nonPortGroups,
      { naming: [true, false, true], other: [false, true, false] },
      '  jumpstat area is solid  ',
    )
    expect(payload.checklist.naming).toEqual([true, false, true, false, false, false])
    expect(payload.checklist.other).toEqual([false, true, false])
    expect(payload.note).toBe('jumpstat area is solid')
  })

  it('normalizes a cleared note to null (explicit reset)', () => {
    const payload = buildChecklistPayload(
      nonPortGroups,
      { naming: [false, false, false, false, false, false] },
      '',
    )
    expect(payload.note).toBeNull()
    expect(payload.checklist.naming).toEqual([false, false, false, false, false, false])
  })

  it('round-trips a saved state unchanged: seeding then building reproduces it', () => {
    const saved: {
      checklist: ApproverChecklist
      note: string
    } = {
      checklist: { naming: [true, false, true], other: [true, false, false] },
      note: 'long note',
    }
    const state = seedChecklistGroups(portGroups, saved.checklist)
    for (const group of portGroups) {
      expect(state[group.key]).toEqual(
        group.rules.map((_, i) => saved.checklist[group.key]?.[i] ?? false),
      )
    }
    const payload = buildChecklistPayload(portGroups, state, saved.note)
    expect(payload.checklist).toEqual(state)
    expect(payload.note).toBe(saved.note)
  })
})