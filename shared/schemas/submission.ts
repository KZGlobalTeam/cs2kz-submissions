import { z } from 'zod'

import { csgoCourseNamesMatchConvention } from '~/shared/utils/course-names'
import type { Game } from '~/shared/schemas/game'

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

/** The submission-content columns both games share: every field a create or
 *  edit write can carry. The per-game refinements below add the game's own
 *  domain rules, so the games parse one base shape and never drift on the
 *  fields they have in common. */
const submissionInputShape = {
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
}

/**
 * The CS2 submission-content shape accepted by the create endpoint (and
 * reused by the owner-edit endpoint, so the two write paths consume one
 * definition and cannot drift apart). The port-evidence cross-field rules are
 * enforced here: a port must carry an authorization screenshot, and port
 * evidence is not allowed on a map that is not a port. The workshop URL is
 * also enforced here with the same rule and messages the client form shows,
 * so both write endpoints reject an invalid URL with a 400 before any write.
 */
export const SubmissionInputSchema = z
  .object(submissionInputShape)
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

/**
 * The CS:GO submission-content shape: the same base columns as CS2, then the
 * game's own domain rules. CS:GO has no Port concept (CONTEXT.md — Port: a
 * CS:GO map is an original that later gets ported to CS2), so isPort must be
 * false and no authorization image or port notes may ride along — any port
 * evidence on a CS:GO write is a caller mistake, 400'd here. And CS:GO course
 * names are not free text: they must follow the convention exactly (`Main`,
 * then `Bonus 1..N` in ascending order), enforced against the wire so a
 * direct API write with a free name dies before the write path.
 */
export const CsgoSubmissionInputSchema = z
  .object(submissionInputShape)
  .superRefine((value, ctx) => {
    if (value.isPort) {
      ctx.addIssue({
        code: 'custom',
        message: 'CS:GO submissions cannot be ports — the port concept belongs to CS2 only',
        path: ['isPort'],
      })
    }

    if (value.portAuthorizationImage) {
      ctx.addIssue({
        code: 'custom',
        message: 'A CS:GO submission cannot carry proof of permission',
        path: ['portAuthorizationImage'],
      })
    }

    if (value.portNotes) {
      ctx.addIssue({
        code: 'custom',
        message: 'A CS:GO submission cannot carry port notes',
        path: ['portNotes'],
      })
    }

    if (!csgoCourseNamesMatchConvention(value.courses.map((course) => course.name))) {
      ctx.addIssue({
        code: 'custom',
        message: 'CS:GO course names must be `Main`, then `Bonus 1`, `Bonus 2`, … in course order',
        path: ['courses'],
      })
    }
  })

/** The wire schema a submission write must satisfy, per game: CS2 keeps
 *  today's port flow and free course names; CS:GO rejects every form of port
 *  evidence and enforces the course-name convention. The create and edit
 *  endpoints both pick their schema here, so the two write paths consume one
 *  definition per game and cannot drift. Both branches parse to the same
 *  output shape (`SubmissionInput`), so callers treat them interchangeably. */
export function submissionInputSchemaFor(game: Game) {
  return game === 'csgo' ? CsgoSubmissionInputSchema : SubmissionInputSchema
}

export type SubmissionInput = z.infer<typeof SubmissionInputSchema>
