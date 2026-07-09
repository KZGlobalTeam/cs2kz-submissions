import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { finalizeSubmission } from '~/server/services/submissions/finalize-submission'
import { requireLeadApprover } from '~/server/utils/permissions'

const tierSchema = z.enum([
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
])

const filterSchema = z.object({
  courseId: z.string().uuid(),
  mode: z.enum(['classic', 'vanilla']),
  nubTier: tierSchema,
  proTier: tierSchema,
  state: z.enum(['unranked', 'pending', 'ranked']),
  isRanked: z.boolean(),
  notes: z.string().nullable(),
})

const bodySchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    decisionNotes: z.string().nullable(),
    filters: z.array(filterSchema),
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

export default defineEventHandler(async (event) => {
  const user = await requireLeadApprover(event)
  const submissionId = getRouterParam(event, 'id')

  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  const body = bodySchema.parse(await readBody(event))
  return finalizeSubmission(submissionId, user.id, body)
})
