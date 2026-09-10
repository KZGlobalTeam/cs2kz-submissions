import { createError, readBody } from 'h3'
import { z } from 'zod'

import { releases } from '~/db/schema'
import { attachSubmissionToRelease } from '~/server/services/releases/attach-submission'
import { db } from '~/server/utils/db'
import { requireLeadApprover } from '~/server/utils/permissions'
import { requireRouteGame } from '~/server/utils/route-game'

const bodySchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable(),
  submissionIds: z.array(z.string().uuid()).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireLeadApprover(event)
  // The release is created in the current context: the game segment is the
  // game the release belongs to, fixed from creation (releases have no
  // content-edit flow).
  const game = requireRouteGame(event)
  const body = bodySchema.parse(await readBody(event))

  const [release] = await db()
    .insert(releases)
    .values({
      name: body.name,
      notes: body.notes,
      createdByUserId: user.id,
      game,
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
