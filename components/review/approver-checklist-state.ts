import type { ApproverChecklist } from '~/shared/schemas/approver-checklist'

import type { SubmissionRulesStep } from '../submission/submissionRules'

import type { ApproverChecklistState } from './approver-checklist-storage'

/**
 * Pure client-side state helpers for the Approver checklist section. Kept
 * free of Vue so the repo's established pure-function test seam can cover
 * the correctness-critical normalization: seeding a fresh section from the
 * parsed browser value, pruning non-visible groups, and building the
 * browser-storage payload.
 */

/** The rule groups shown in the section: every group the mapper acknowledges
 *  in the pre-submission dialog, minus the porting group unless the
 *  submission actually is a port. Port-group visibility is driven solely by
 *  the recorded `isPort` fact — there is no approver-side toggle. */
export function visibleRuleGroups(
  steps: readonly SubmissionRulesStep[],
  isPort: boolean,
): SubmissionRulesStep[] {
  return steps.filter((step) => !step.askIsPort || isPort)
}

/**
 * Builds a rule-group tick map normalized against the current rule set,
 * starting from the parsed browser checklist (or nothing when the key is
 * absent — a reset-to-nothing save removes the key entirely, so "never
 * saved" and "reset" both arrive as no saved ticks). Every rendered group
 * is present; ticks are per rule index, missing or over-long saved entries
 * fall back to unchecked; saved keys for groups that are not rendered (e.g.
 * a stale `porting` group on a non-port submission) are dropped.
 */
export function seedChecklistGroups(
  groups: readonly SubmissionRulesStep[],
  ticks?: ApproverChecklist | null,
): ApproverChecklist {
  const state: ApproverChecklist = {}
  for (const group of groups) {
    const saved = ticks?.[group.key]
    state[group.key] = group.rules.map((_, i) => saved?.[i] ?? false)
  }
  return state
}

/** The note is trimmed, and empty or whitespace-only notes are normalized to
 *  null — the shape the browser-storage module serializes (whose 2000-char
 *  cap is enforced at the storage boundary), and the null note participates
 *  in the fully-cleared state that removes the key. */
export function normalizeNote(note: string): string | null {
  const trimmed = note.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Whether the parsed saved state carries anything worth showing read-only:
 * any tick set or a non-empty note. Drives the "never saved ⇒ hidden
 * entirely" rule for the read-only card — both an absent key and a
 * fully-cleared state (every box unchecked, note empty, key removed) render
 * nothing, so a finished submission never shows an empty box.
 */
export function hasSavedContent(
  ticks: ApproverChecklist | null | undefined,
  note: string | null | undefined,
): boolean {
  if (ticks) {
    for (const groupTicks of Object.values(ticks)) {
      if (groupTicks.some(Boolean)) {
        return true
      }
    }
  }
  if (note) {
    return note.trim() !== ''
  }
  return false
}

/** The browser-storage payload the storage module serializes: ticks
 *  normalized to the current rule set and the note normalized as above. The
 *  shape is exactly the parsed browser value (`ApproverChecklistState`), so
 *  seeding from `store.read()` and saving through `store.save()` round-trip
 *  without translation. */
export function buildChecklistPayload(
  groups: readonly SubmissionRulesStep[],
  ticks: ApproverChecklist,
  note: string,
): ApproverChecklistState {
  return {
    checklist: seedChecklistGroups(groups, ticks),
    note: normalizeNote(note),
  }
}