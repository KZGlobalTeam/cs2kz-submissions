import { readBody } from 'h3'

import { createSubmission } from '~/server/services/submissions/create-submission'
import { SubmissionInputSchema } from '~/shared/schemas/submission'
import { requireAuth } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = SubmissionInputSchema.parse(await readBody(event))

  return createSubmission(user.id, body)
})