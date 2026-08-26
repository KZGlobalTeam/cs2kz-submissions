import { z } from 'zod'

/**
 * One approver's saved ticks: rule-group key → per-rule booleans. The keys
 * are deliberately loose — the rule set can change without breaking saves —
 * and unknown keys are merely never rendered. Ticks are per-index within each
 * group, so a rule-text edit reflects on both surfaces without a migration
 * (ADR 0003: a stored tick may then sit against updated text at the same
 * index, accepted for a private scratchpad).
 */
export type ApproverChecklist = Record<string, boolean[]>

/**
 * The PUT body for `PUT /api/submissions/[id]/approver-checklist`. `checklist`
 * is a loose key → boolean-array map (rejects non-object bodies and
 * non-boolean array entries); `note` is trimmed, capped at 2000 characters,
 * and normalized to `null` when empty or whitespace-only — so a "reset to
 * nothing" save (empty checklist, cleared note) stores a real row that stays
 * distinguishable from "never saved".
 */
export const ApproverChecklistBodySchema = z.object({
  checklist: z.record(z.string(), z.array(z.boolean())),
  note: z
    .string()
    .trim()
    .max(2000, { message: 'Note must be at most 2000 characters' })
    .nullable()
    .transform((note) => (note === '' ? null : note)),
})

export type ApproverChecklistInput = z.infer<
  typeof ApproverChecklistBodySchema
>