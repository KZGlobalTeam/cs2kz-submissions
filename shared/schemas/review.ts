import { z } from 'zod'

import { RejectionAttachmentSchema } from './attachment'
import {
  CourseFilterStateSchema,
  CourseFilterTierSchema,
  ModeSchema,
} from './cs2kz'

/** One proposed rating of a single Course in a single Course mode, carried on
 *  an approver's Vote. Composes the shared tier and mode schemas so the wire
 *  shape cannot drift from the DB enums or the UI tier scale. */
export const VoteFilterSchema = z.object({
  courseId: z.string().uuid(),
  mode: ModeSchema,
  nubTier: CourseFilterTierSchema,
  proTier: CourseFilterTierSchema,
  isRanked: z.boolean(),
  notes: z.string().nullable(),
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
    if (value.approvalDecision === 'no' && !value.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason for rejection is required when approval decision is No',
        path: ['rejectionReason'],
      })
    }
  })

/** The lead approver's settled version of a Vote's proposed filter: the same
 *  shape plus the Finalized filter state. */
export const FinalFilterSchema = VoteFilterSchema.extend({
  state: CourseFilterStateSchema,
})

/** The Decision request body (`PUT /api/submissions/[id]/decision`). */
export const LeadDecisionSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    decisionNotes: z.string().nullable(),
    attachments: z.array(RejectionAttachmentSchema).default([]),
    filters: z.array(FinalFilterSchema),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'rejected' && !value.decisionNotes) {
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