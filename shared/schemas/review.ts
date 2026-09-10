import { z } from 'zod'

import { RejectionAttachmentSchema } from './attachment'
import {
  CourseFilterStateSchema,
  CourseFilterTierSchema,
  ModeSchema,
} from './cs2kz'

/** Domain rule (CONTEXT.md): a rejection carries a required reason — a
 *  whitespace-only string is not a reason. Shared by the Vote and Decision
 *  bodies so the two write paths cannot disagree.*/
function hasWrittenReason(value: string | null): boolean {
  return value !== null && value.trim().length > 0
}

/** The Course-filter fields shared by a Vote proposal and a Finalized filter:
 *  the Course, the mode, and the two tier ratings. Composes the shared tier
 *  and mode schemas so the wire shape cannot drift from the DB enums or the
 *  UI tier scale. `notes` deliberately does NOT live here: a Finalized filter
 *  never carries reasoning (the finalized-reasoning purge), so the two
 *  decision sides now encode different truth — a Vote proposal keeps its
 *  notes, a Decision's Finalized filter rejects them. */
const FilterFieldsSchema = z.object({
  courseId: z.string().uuid(),
  mode: ModeSchema,
  nubTier: CourseFilterTierSchema,
  proTier: CourseFilterTierSchema,
})

/** One proposed rating of a single Course in a single Course mode, carried on
 *  an approver's Vote. Proposals carry their own `isRanked` — a proposal has
 *  no `state` to derive it from — and the approver's reasoning `notes`, the
 *  one place the shared filter fields carry a note (proposal-only; see the
 *  Filter note entry in CONTEXT.md). */
export const VoteFilterSchema = FilterFieldsSchema.extend({
  isRanked: z.boolean(),
  notes: z.string().nullable(),
})

/** The Vote request body (`PUT /api/[game]/submissions/[id]/vote`). */
export const SubmissionVoteSchema = z
  .object({
    approvalDecision: z.enum(['yes', 'no']),
    rejectionReason: z.string().nullable(),
    // Optional free text on a yes vote (the mirror of the required Rejection
    // reason on No, minus the requiredness). No cross-side rule: a note is
    // valid on either decision — the write path normalizes it to null on a
    // No vote (and on any "note" that is only whitespace), matching how a
    // yes vote always stores a null Rejection reason today.
    approvalNote: z.string().nullable().optional().default(null),
    attachments: z.array(RejectionAttachmentSchema).default([]),
    filters: z.array(VoteFilterSchema),
  })
  .superRefine((value, ctx) => {
    if (value.approvalDecision === 'no' && !hasWrittenReason(value.rejectionReason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason for rejection is required when approval decision is No',
        path: ['rejectionReason'],
      })
    }
  })

/** The lead approver's settled version of a Vote's proposed filter: the shared
 *  filter fields plus the Finalized filter state. The wire carries no
 *  `isRanked` — the write derives it from `state` (`isRanked ⇔
 *  state = 'ranked'`), an invariant nothing on the wire would enforce — and
 *  never a `notes`: a Finalized filter carries no reasoning, so a Decision
 *  body that sends one is rejected (a leftover lead-decision form posting its
 *  old hardcoded null gets a 400, not silent storage). */
export const FinalFilterSchema = FilterFieldsSchema.extend({
  state: CourseFilterStateSchema,
  notes: z.never().optional(),
})

/** The Decision request body (`PUT /api/[game]/submissions/[id]/decision`). Enforces
 *  the same rejection rules as the Vote body: a rejection requires a trimmed
 *  non-empty Decision note (below), and Rejection attachments are only valid
 *  on a rejection alongside one — that guard lives in the attachment-rules
 *  module, invoked once from the review-write spine shared by both paths. */
export const LeadDecisionSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    decisionNotes: z.string().nullable(),
    attachments: z.array(RejectionAttachmentSchema).default([]),
    filters: z.array(FinalFilterSchema),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'rejected' && !hasWrittenReason(value.decisionNotes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Decision notes are required for rejected submissions',
        path: ['decisionNotes'],
      })
    }
  })

export type VoteFilterInput = z.infer<typeof VoteFilterSchema>
export type SubmissionVoteInput = z.infer<typeof SubmissionVoteSchema>
export type FinalFilterInput = z.infer<typeof FinalFilterSchema>
export type LeadDecisionInput = z.infer<typeof LeadDecisionSchema>