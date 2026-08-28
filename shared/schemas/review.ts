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
 *  the Course, the mode, the two tier ratings, and optional notes. Composes
 *  the shared tier and mode schemas so the wire shape cannot drift from the
 *  DB enums or the UI tier scale. */
const FilterFieldsSchema = z.object({
  courseId: z.string().uuid(),
  mode: ModeSchema,
  nubTier: CourseFilterTierSchema,
  proTier: CourseFilterTierSchema,
  notes: z.string().nullable(),
})

/** One proposed rating of a single Course in a single Course mode, carried on
 *  an approver's Vote. Proposals carry their own `isRanked` — a proposal has
 *  no `state` to derive it from. */
export const VoteFilterSchema = FilterFieldsSchema.extend({
  isRanked: z.boolean(),
})

/** The Vote request body (`PUT /api/submissions/[id]/vote`). */
export const SubmissionVoteSchema = z
  .object({
    approvalDecision: z.enum(['yes', 'no']),
    rejectionReason: z.string().nullable(),
    rejectionExplanation: z.string().nullable().optional().default(null),
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
 *  state = 'ranked'`), an invariant nothing on the wire would enforce. */
export const FinalFilterSchema = FilterFieldsSchema.extend({
  state: CourseFilterStateSchema,
})

/** The Decision request body (`PUT /api/submissions/[id]/decision`). Enforces
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