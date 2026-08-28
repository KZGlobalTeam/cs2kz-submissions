import { z } from 'zod'

/** A mapper credited on a submission (or on one of its courses). */
export const SubmissionMapperSchema = z.object({
  steamId64: z.string().min(1),
  displayName: z.string().min(1),
})

/** The canonical course image: a fixed 1920×1080 JPG. Mirrors what the
 *  course-image upload endpoint validates and returns. */
export const SubmissionCourseImageSchema = z.object({
  url: z.string().url(),
  mime: z.literal('image/jpeg'),
  width: z.literal(1920),
  height: z.literal(1080),
  sizeBytes: z.number().int().positive(),
})

/** A screenshot uploaded as port evidence. Unlike course images, PNG is also
 *  accepted and there is no fixed resolution. */
export const SubmissionPortImageSchema = z.object({
  url: z.string().url(),
  mime: z.enum(['image/jpeg', 'image/png']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
})

/** One playable route on the map, with its own course image and mappers. */
export const SubmissionCourseSchema = z.object({
  name: z.string().min(1),
  image: SubmissionCourseImageSchema,
  mappers: z.array(SubmissionMapperSchema).min(1),
})

/** The strict workshop-URL shape the client form enforces: a
 *  `steamcommunity.com` sharedfiles or workshop filedetails page carrying a
 *  numeric `id`. Pinned here so the wire shape already rejects what the UI
 *  rejects — an invalid URL dies with a 400 at endpoint parse instead of
 *  reaching the write path. */
function isSteamWorkshopUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return (
      parsed.hostname === 'steamcommunity.com' &&
      /\/(?:sharedfiles|workshop)\/filedetails\/$/.test(parsed.pathname) &&
      parsed.searchParams.has('id') &&
      /^\d+$/.test(parsed.searchParams.get('id') ?? '')
    )
  }
  catch {
    return false
  }
}

/**
 * The validated submission-content shape accepted by the create endpoint (and
 * reused by the owner-edit endpoint, so the two write paths consume one
 * definition and cannot drift apart). The port-evidence cross-field rules are
 * enforced here: a port must carry an authorization screenshot, and port
 * evidence is not allowed on a map that is not a port. The workshop URL is
 * also enforced here with the same rule and messages the client form shows,
 * so both write endpoints reject an invalid URL with a 400 before any write.
 */
export const SubmissionInputSchema = z
  .object({
    workshopUrl: z
      .string()
      .min(1, 'Workshop URL is required')
      .url('Must be a valid URL')
      .refine(isSteamWorkshopUrl, 'Must be a Steam Workshop URL'),
    mapName: z.string().min(1),
    notes: z.string().nullable(),
    isPort: z.boolean(),
    portAuthorizationImage: SubmissionPortImageSchema.nullable(),
    portNotes: z.string().nullable(),
    mappers: z.array(SubmissionMapperSchema).min(1),
    courses: z.array(SubmissionCourseSchema).min(1),
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

export type SubmissionInput = z.infer<typeof SubmissionInputSchema>