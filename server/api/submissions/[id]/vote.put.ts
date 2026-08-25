import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { RejectionAttachmentSchema } from '~/shared/schemas/attachment'
import { saveVote } from '~/server/services/votes/save-vote'
import { requireApprover } from '~/server/utils/permissions'

const filterSchema = z.object({
  courseId: z.string().uuid(),
  mode: z.enum(['classic', 'vanilla']),
  nubTier: z.enum([
    'very-easy',
    'easy',
    'medium',
    'advanced',
    'hard',
    'very-hard',
    'extreme',
    'death',
    'unfeasible',
    'impossible',
  ]),
  proTier: z.enum([
    'very-easy',
    'easy',
    'medium',
    'advanced',
    'hard',
    'very-hard',
    'extreme',
    'death',
    'unfeasible',
    'impossible',
  ]),
  isRanked: z.boolean(),
  notes: z.string().nullable(),
})

const bodySchema = z
  .object({
    approvalDecision: z.enum(['yes', 'no']),
    rejectionReason: z.string().nullable(),
    rejectionExplanation: z.string().nullable().optional().default(null),
    attachments: z.array(RejectionAttachmentSchema).default([]),
    filters: z.array(filterSchema),
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

export default defineEventHandler(async (event) => {
  const user = await requireApprover(event)
  const submissionId = getRouterParam(event, 'id')

  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  const body = bodySchema.parse(await readBody(event))
  return saveVote(submissionId, user.id, body)
})
