import { describe, expect, it } from 'vitest'

import {
  CsgoSubmissionInputSchema,
  SubmissionInputSchema,
  submissionInputSchemaFor,
  type SubmissionInput,
} from '~/shared/schemas/submission'

const mapper = { steamId64: '76561198000000000', displayName: 'test mapper' } as const
const courseImage = {
  url: 'https://project.supabase.co/storage/v1/object/public/submissions/course-1.jpg',
  mime: 'image/jpeg',
  width: 1920,
  height: 1080,
  sizeBytes: 1_234,
} as const
const portImage = {
  url: 'https://project.supabase.co/storage/v1/object/public/submissions/port.png',
  mime: 'image/png',
  width: 800,
  height: 600,
  sizeBytes: 2_345,
} as const

function body(overrides: Partial<SubmissionInput> = {}): SubmissionInput {
  return {
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=123456789',
    mapName: 'kz_test_map',
    notes: null,
    isPort: false,
    portAuthorizationImage: null,
    portNotes: null,
    mappers: [mapper],
    courses: [
      {
        name: 'Main',
        image: courseImage,
        mappers: [mapper],
      },
    ],
    ...overrides,
  }
}

/** Builds a body cast to `unknown` so deliberately-invalid values can still
 *  reach the schema at runtime — TypeScript rightly refuses to type them as
 *  `SubmissionInput`, which already proves the schema's width/height/mime
 *  strictness. */
function rawBody(overrides: Record<string, unknown>): unknown {
  return { ...body(), ...overrides }
}

/** A valid CS:GO body: no port evidence and convention-named courses. The
 *  CS:GO schema shares the base columns; the game's own rules (no ports,
 *  `Main`/`Bonus N` names) are what distinguish it from the CS2 cases. */
function csgoBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    ...body(),
    courses: [
      { name: 'Main', image: courseImage, mappers: [mapper] },
      { name: 'Bonus 1', image: courseImage, mappers: [mapper] },
    ],
    ...overrides,
  }
}

describe('SubmissionInputSchema', () => {
  it('accepts a complete non-port submission', () => {
    const result = SubmissionInputSchema.safeParse(body())
    expect(result.success).toBe(true)
  })

  it('accepts a complete port submission with authorization image', () => {
    const result = SubmissionInputSchema.safeParse(
      body({
        isPort: true,
        portAuthorizationImage: portImage,
        portNotes: 'Ported with permission from the original author',
      }),
    )
    expect(result.success).toBe(true)
  })

  it('accepts a sharedfiles workshop URL with a numeric id', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=123456789' }),
    )
    expect(result.success).toBe(true)
  })

  it('accepts a workshop filedetails URL with a numeric id', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ workshopUrl: 'https://steamcommunity.com/workshop/filedetails/?id=123456789' }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects an empty workshop URL with the client message', () => {
    const result = SubmissionInputSchema.safeParse(body({ workshopUrl: '' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Workshop URL is required',
          path: ['workshopUrl'],
        }),
        expect.objectContaining({
          message: 'Must be a valid URL',
          path: ['workshopUrl'],
        }),
        expect.objectContaining({
          message: 'Must be a Steam Workshop URL',
          path: ['workshopUrl'],
        }),
      ])
    }
  })

  it('rejects a workshop URL that is not a valid URL with the client messages', () => {
    const result = SubmissionInputSchema.safeParse(body({ workshopUrl: 'not a url' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Must be a valid URL',
          path: ['workshopUrl'],
        }),
        expect.objectContaining({
          message: 'Must be a Steam Workshop URL',
          path: ['workshopUrl'],
        }),
      ])
    }
  })

  it('rejects a workshop URL on a non-steamcommunity host', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ workshopUrl: 'https://example.com/sharedfiles/filedetails/?id=123456789' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Must be a Steam Workshop URL',
          path: ['workshopUrl'],
        }),
      ])
    }
  })

  it('rejects a workshop URL whose path is not a filedetails page', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ workshopUrl: 'https://steamcommunity.com/files/details/?id=123456789' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Must be a Steam Workshop URL',
          path: ['workshopUrl'],
        }),
      ])
    }
  })

  it('rejects a workshop URL with a non-numeric id', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=abc' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Must be a Steam Workshop URL',
          path: ['workshopUrl'],
        }),
      ])
    }
  })

  it('rejects a workshop URL without an id', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Must be a Steam Workshop URL',
          path: ['workshopUrl'],
        }),
      ])
    }
  })

  it('requires an authorization screenshot on a port', () => {
    const result = SubmissionInputSchema.safeParse(body({ isPort: true }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message:
            'An authorization screenshot from the original author is required for ported maps',
          path: ['portAuthorizationImage'],
        }),
      ])
    }
  })

  it('rejects port evidence on a non-port submission', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ portAuthorizationImage: portImage, portNotes: 'sneaky' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Port evidence can only be provided for ported maps',
          path: ['isPort'],
        }),
      ])
    }
  })

  it('rejects a submission with no mappers', () => {
    const result = SubmissionInputSchema.safeParse(body({ mappers: [] }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['mappers'] }),
      ])
    }
  })

  it('rejects a submission with no courses', () => {
    const result = SubmissionInputSchema.safeParse(body({ courses: [] }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['courses'] }),
      ])
    }
  })

  it('rejects a course with no mappers', () => {
    const result = SubmissionInputSchema.safeParse(
      body({ courses: [{ name: 'Main', image: courseImage, mappers: [] }] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['courses', 0, 'mappers'] }),
      ])
    }
  })

  it('rejects a course image that is not a 1920x1080 JPG', () => {
    const result = SubmissionInputSchema.safeParse(
      rawBody({
        courses: [
          {
            name: 'Main',
            image: { ...courseImage, mime: 'image/png', width: 640, height: 480 },
            mappers: [mapper],
          },
        ],
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['courses', 0, 'image', 'mime'] }),
        expect.objectContaining({ path: ['courses', 0, 'image', 'width'] }),
        expect.objectContaining({ path: ['courses', 0, 'image', 'height'] }),
      ])
    }
  })

  it('rejects a port image with a mime other than JPG/PNG', () => {
    const result = SubmissionInputSchema.safeParse(
      rawBody({
        isPort: true,
        portAuthorizationImage: { ...portImage, mime: 'image/gif' },
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['portAuthorizationImage', 'mime'] }),
      ])
    }
  })
})

describe('submissionInputSchemaFor', () => {
  it('dispatches each game to its own schema, so the write endpoints cannot drift', () => {
    expect(submissionInputSchemaFor('cs2')).toBe(SubmissionInputSchema)
    expect(submissionInputSchemaFor('csgo')).toBe(CsgoSubmissionInputSchema)
  })
})

describe('CsgoSubmissionInputSchema', () => {
  it('accepts a convention-named submission with no port evidence', () => {
    expect(CsgoSubmissionInputSchema.safeParse(csgoBody()).success).toBe(true)
  })

  it('rejects isPort=true — CS:GO has no Port concept', () => {
    const result = CsgoSubmissionInputSchema.safeParse(csgoBody({ isPort: true }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'CS:GO submissions cannot be ports — the port concept belongs to CS2 only',
          path: ['isPort'],
        }),
      ])
    }
  })

  it('rejects a port authorization screenshot', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({ portAuthorizationImage: portImage }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'A CS:GO submission cannot carry proof of permission',
          path: ['portAuthorizationImage'],
        }),
      ])
    }
  })

  it('rejects port notes', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({ portNotes: 'Ported with permission from the original author' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'A CS:GO submission cannot carry port notes',
          path: ['portNotes'],
        }),
      ])
    }
  })

  it('rejects every port-evidence form at once, one issue each', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({ isPort: true, portAuthorizationImage: portImage, portNotes: 'ported' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ['isPort'],
        ['portAuthorizationImage'],
        ['portNotes'],
      ])
    }
  })

  it('accepts the full convention: Main, then Bonus 1..N in ascending order', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({
        courses: [
          { name: 'Main', image: courseImage, mappers: [mapper] },
          { name: 'Bonus 1', image: courseImage, mappers: [mapper] },
          { name: 'Bonus 2', image: courseImage, mappers: [mapper] },
        ],
      }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a free course name outside the convention', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({
        courses: [
          { name: 'Main', image: courseImage, mappers: [mapper] },
          { name: 'Course B', image: courseImage, mappers: [mapper] },
        ],
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'CS:GO course names must be `Main`, then `Bonus 1`, `Bonus 2`, … in course order',
          path: ['courses'],
        }),
      ])
    }
  })

  it('rejects a first course that is not Main', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({ courses: [{ name: 'Bonus 1', image: courseImage, mappers: [mapper] }] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['courses'] }),
      ])
    }
  })

  it('rejects a gap in the bonus sequence (Bonus 2 without Bonus 1)', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({
        courses: [
          { name: 'Main', image: courseImage, mappers: [mapper] },
          { name: 'Bonus 2', image: courseImage, mappers: [mapper] },
        ],
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['courses'] }),
      ])
    }
  })

  it('rejects a stray Main later in the order', () => {
    const result = CsgoSubmissionInputSchema.safeParse(
      csgoBody({
        courses: [
          { name: 'Main', image: courseImage, mappers: [mapper] },
          { name: 'Main', image: courseImage, mappers: [mapper] },
        ],
      }),
    )
    expect(result.success).toBe(false)
  })

  it('still rejects an empty course list (the shared at-least-one rule)', () => {
    const result = CsgoSubmissionInputSchema.safeParse(csgoBody({ courses: [] }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['courses'] }),
      ])
    }
  })
})
