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

const portImageSchema = z.object({
  url: z.string().url(),
  mime: z.enum(['image/jpeg', 'image/png']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
})

const bodySchema = z
  .object({
    workshopUrl: z.string().min(1),
    mapName: z.string().min(1),
    notes: z.string().nullable(),
    isPort: z.boolean(),
    portAuthorizationImage: portImageSchema.nullable(),
    portNotes: z.string().nullable(),
    mappers: z.array(mapperSchema).min(1),
    courses: z.array(courseSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.isPort && !value.portAuthorizationImage) {
      ctx.addIssue({
        code: 'custom',
        message: 'An authorization screenshot from the original author is required for ported maps',
        path: ['portAuthorizationImage'],
      })
    }

    if (!value.isPort && (value.portAuthorizationImage || value.portNotes)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Port evidence can only be provided for ported maps',
        path: ['isPort'],
      })
    }
  })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = bodySchema.parse(await readBody(event))

  return createSubmission(user.id, body)
})
