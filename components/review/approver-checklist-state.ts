import type { ApproverChecklist } from '~/shared/schemas/approver-checklist'

import type { SubmissionRulesStep } from '../submission/submissionRules'

/**
 * Pure client-side state helpers for the Approver checklist section. Kept
 * free of Vue so the repo's established pure-function test seam can cover
 * the correctness-critical normalization: seeding a fresh section from a
 * saved row, pruning non-visible groups, and building the auto-save payload.
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
 * starting from a saved checklist (or nothing when the approver never saved
 * — including the case where a real row exists but was reset to nothing).
 * Every rendered group is present; ticks are per rule index, missing or
 * over-long saved entries fall back to unchecked; saved keys for groups that
 * are not rendered (e.g. a stale `porting` group on a non-port submission)
 * are dropped.
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
 *  null — mirroring the server-side body schema so an explicit "reset to
 *  nothing" and "never saved" stay distinguishable. */
export function normalizeNote(note: string): string | null {
  const trimmed = note.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Whether a saved row carries anything worth showing read-only: any tick set
 * or a non-empty note. Drives the "never saved ⇒ hidden entirely" rule for
 * the read-only section — both a missing row and a reset-to-nothing row
 * (every box unchecked, note cleared) render nothing, so a finished
 * submission never shows an empty box.
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

export interface ApproverChecklistPayload {
  checklist: ApproverChecklist
  note: string | null
}

/** The body sent to `PUT /api/submissions/[id]/approver-checklist`: ticks
 *  normalized to the current rule set and the note normalized as above. */
export function buildChecklistPayload(
  groups: readonly SubmissionRulesStep[],
  ticks: ApproverChecklist,
  note: string,
): ApproverChecklistPayload {
  return {
    checklist: seedChecklistGroups(groups, ticks),
    note: normalizeNote(note),
  }
}