import { readBody } from 'h3'
import { z } from 'zod'

import { createSubmission } from '~/server/services/submissions/create-submission'
import { requireAuth } from '~/server/utils/permissions'

const mapperSchema = z.object({
  steamId64: z.string().min(1),
  displayName: z.string().min(1),
})

const courseSchema = z.object({
  name: z.string().min(1),
  image: z.object({
    url: z.string().url(),
    mime: z.literal('image/jpeg'),
    width: z.literal(1920),
    height: z.literal(1080),
    sizeBytes: z.number().int().positive(),
  }),
  mappers: z.array(mapperSchema).min(1),
})

const bodySchema = z.object({
  workshopUrl: z.string().min(1),
  mapName: z.string().min(1),
  notes: z.string().nullable(),
  mappers: z.array(mapperSchema).min(1),
  courses: z.array(courseSchema).min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = bodySchema.parse(await readBody(event))

  return createSubmission(user.id, body)
})
