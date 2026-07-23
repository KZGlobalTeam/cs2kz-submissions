import { createError, readBody } from 'h3'
import { z } from 'zod'

import { releases } from '~/db/schema'
import { attachSubmissionToRelease } from '~/server/services/releases/attach-submission'
import { db } from '~/server/utils/db'
import { requireLeadApprover } from '~/server/utils/permissions'

const bodySchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable(),
  submissionIds: z.array(z.string().uuid()).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireLeadApprover(event)
  const body = bodySchema.parse(await readBody(event))

  const [release] = await db()
    .insert(releases)
    .values({
      name: body.name,
      notes: body.notes,
      createdByUserId: user.id,
    })
    .returning()

  if (!release) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create release',
    })
  }

  for (const submissionId of body.submissionIds ?? []) {
    await attachSubmissionToRelease(release.id, submissionId)
  }

  return release
})
