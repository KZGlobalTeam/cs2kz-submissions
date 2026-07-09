import { readBody } from 'h3'
import { z } from 'zod'

import { releases } from '~/db/schema'
import { db } from '~/server/utils/db'
import { requireLeadApprover } from '~/server/utils/permissions'

const bodySchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable(),
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

  return release
})
