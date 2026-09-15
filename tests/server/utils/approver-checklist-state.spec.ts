import { describe, expect, it } from 'vitest'

import {
  csgoSubmissionRulesSteps,
  rulesStepsForGame,
  submissionRulesSteps,
} from '~/components/submission/submissionRules'
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

describe('rulesStepsForGame', () => {
  it('returns the CS2 set for CS2 — porting included, exactly as today', () => {
    expect(rulesStepsForGame('cs2')).toBe(submissionRulesSteps)
    expect(rulesStepsForGame('cs2').map((step) => step.key)).toContain('porting')
    expect(rulesStepsForGame('cs2').map((step) => step.key)).toEqual([
      'naming',
      'courses',
      'ranked',
      'jumpstat',
      'porting',
      'other',
    ])
  })

  it('returns the CS:GO copy for CS:GO — never the CS2 set, no porting group', () => {
    const csgo = rulesStepsForGame('csgo')
    expect(csgo.map((step) => step.key)).toEqual([
      'naming',
      'courses',
      'ranked',
      'jumpstat',
      'other',
    ])
    expect(csgoSubmissionRulesSteps).toBe(csgo)
  })

  it('is a structural copy of CS2 minus porting, with the two pinned CS:GO divergences, as independent objects', () => {
    // The CS:GO set began as a placeholder copy of the CS2 rules minus the
    // porting group (CONTEXT.md — Submission rules), then diverged on purpose
    // (ticket #2): the ranked group is titled for the CS:GO `Main` course,
    // and the jumpstat group omits CS2's `!lj` teleport rule. Both
    // divergences are pinned explicitly below; every other group must read
    // identically, so an accidental edit to either set fails here.
    const cs2WithoutPorting = submissionRulesSteps.filter((step) => !step.askIsPort)
    const ljRuleText = 'Doing `!lj` should teleport you to the jumpstat area.'

    const csgoJumpstat = csgoSubmissionRulesSteps.find((step) => step.key === 'jumpstat')!
    const cs2Jumpstat = cs2WithoutPorting.find((step) => step.key === 'jumpstat')!
    const csgoRanked = csgoSubmissionRulesSteps.find((step) => step.key === 'ranked')!
    const cs2Ranked = cs2WithoutPorting.find((step) => step.key === 'ranked')!

    expect(csgoSubmissionRulesSteps.map((step) => step.key)).toEqual(
      cs2WithoutPorting.map((step) => step.key),
    )

    // Pinned divergence 1 — retitled ranked group: "Rules for Main Courses"
    // on CS:GO, "Rules for Ranked Courses" on CS2.
    expect(csgoRanked.title).toBe('Rules for Main Courses')
    expect(cs2Ranked.title).toBe('Rules for Ranked Courses')

    // Pinned divergence 2 — the jumpstat group is CS2's minus exactly the
    // `!lj` teleport rule (no jumpstat teleport on CS:GO).
    expect(cs2Jumpstat.rules.map((rule) => rule.text)).toContain(ljRuleText)
    expect(csgoJumpstat.rules.map((rule) => rule.text)).not.toContain(ljRuleText)
    expect(csgoJumpstat.rules.map((rule) => rule.text)).toEqual(
      cs2Jumpstat.rules.map((rule) => rule.text).filter((text) => text !== ljRuleText),
    )

    // Everything else reads identically to CS2 minus the porting group…
    csgoSubmissionRulesSteps.forEach((step, i) => {
      const cs2Step = cs2WithoutPorting[i]!
      if (step.key !== 'jumpstat') {
        expect(step.rules.map((rule) => rule.text)).toEqual(
          cs2Step.rules.map((rule) => rule.text),
        )
      }
      if (step.key !== 'ranked') {
        expect(step.title).toBe(cs2Step.title)
      }
      // …and the two sets are structurally independent: never shared objects.
      expect(step).not.toBe(cs2Step)
      expect(step.rules).not.toBe(cs2Step.rules)
    })

    expect(csgoSubmissionRulesSteps).not.toBe(submissionRulesSteps)
  })

  it('never renders the porting group on a CS:GO checklist, port or not', () => {
    // CS:GO rows are never ports (the wire schema rejects port evidence), but
    // even with the flag flipped, the CS:GO copy has no porting group to show.
    const withPort = visibleRuleGroups(rulesStepsForGame('csgo'), true)
    expect(withPort.map((group) => group.key)).not.toContain('porting')
    expect(withPort.map((group) => group.key)).toEqual([
      'naming',
      'courses',
      'ranked',
      'jumpstat',
      'other',
    ])
  })
})

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
    expect(state.naming).toEqual([true, false, true, false, false])
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
    expect(payload.checklist.naming).toEqual([true, false, true, false, false])
    expect(payload.checklist.other).toEqual([false, true, false])
    expect(payload.note).toBe('jumpstat area is solid')
  })

  it('normalizes a cleared note to null (explicit reset)', () => {
    const payload = buildChecklistPayload(
      nonPortGroups,
      { naming: [false, false, false, false, false] },
      '',
    )
    expect(payload.note).toBeNull()
    expect(payload.checklist.naming).toEqual([false, false, false, false, false])
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
