import { describe, expect, it } from 'vitest'

import type { ReleaseContents } from '~/server/services/release-contents'
import { toReleaseExport, toReleaseExportPayload } from '~/server/utils/export-release'

describe('toReleaseExport', () => {
  it('matches the map-release JSON template shape', () => {
    const result = toReleaseExport([
      {
        name: 'mute',
        workshopId: 2798160350,
        mappers: ['76561197960265728'],
        courses: [
          {
            name: 'Main',
            mappers: ['76561197960265728'],
            filters: {
              classic: {
                nub_tier: 'very-easy' as const,
                pro_tier: 'medium' as const,
                state: 'ranked' as const,
                notes: null,
              },
              vanilla: {
                nub_tier: 'very-easy' as const,
                pro_tier: 'medium' as const,
                state: 'ranked' as const,
                notes: null,
              },
            },
          },
        ],
      },
    ])

    expect(result).toEqual([
      {
        name: 'mute',
        workshop_id: 2798160350,
        state: 'approved',
        mappers: ['76561197960265728'],
        courses: [
          {
            name: 'Main',
            filters: {
              classic: {
                nub_tier: 'very-easy',
                pro_tier: 'medium',
                state: 'ranked',
                notes: '',
              },
              vanilla: {
                nub_tier: 'very-easy',
                pro_tier: 'medium',
                state: 'ranked',
                notes: '',
              },
            },
            mappers: ['76561197960265728'],
          },
        ],
      },
    ])
  })

  it('omits optional description fields when there is no value', () => {
    const map = toReleaseExport([
      {
        name: 'mute',
        workshopId: 2798160350,
        mappers: ['76561197960265728'],
        courses: [
          {
            name: 'Main',
            mappers: ['76561197960265728'],
            filters: {
              classic: {
                nub_tier: 'easy' as const,
                pro_tier: 'hard' as const,
                state: 'pending' as const,
                notes: '',
              },
              vanilla: {
                nub_tier: 'easy' as const,
                pro_tier: 'hard' as const,
                state: 'pending' as const,
                notes: '',
              },
            },
          },
        ],
      },
    ])[0]!

    expect(map).not.toHaveProperty('description')
    expect(map.courses[0]!).not.toHaveProperty('description')
  })

  it('emits all template keys for a fully populated map', () => {
    const map = toReleaseExport([
      {
        name: 'mute',
        workshopId: 2798160350,
        mappers: ['76561197960265728'],
        courses: [
          {
            name: 'Main',
            mappers: ['76561197960265728'],
            filters: {
              classic: {
                nub_tier: 'very-easy' as const,
                pro_tier: 'medium' as const,
                state: 'ranked' as const,
                notes: 'surf route',
              },
              vanilla: {
                nub_tier: 'very-easy' as const,
                pro_tier: 'medium' as const,
                state: 'ranked' as const,
                notes: '',
              },
            },
          },
        ],
      },
    ])[0]!

    // Map-level keys, in template order.
    expect(Object.keys(map)).toEqual([
      'name',
      'workshop_id',
      'state',
      'mappers',
      'courses',
    ])
    // Course-level keys, in template order.
    expect(Object.keys(map.courses[0]!)).toEqual(['name', 'filters', 'mappers'])
    // Filter keys, in template order.
    expect(Object.keys(map.courses[0]!.filters.classic)).toEqual([
      'nub_tier',
      'pro_tier',
      'state',
      'notes',
    ])
    // Real notes survive; empty notes are emitted as "".
    expect(map.courses[0]!.filters.classic.notes).toBe('surf route')
    expect(map.courses[0]!.filters.vanilla.notes).toBe('')
  })
})

describe('toReleaseExportPayload', () => {
  const contents = (): ReleaseContents => ({
    releaseName: 'Release One',
    maps: [
      {
        mapName: 'mute',
        workshopId: 2798160350,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        mappers: ['76561197960265728', '76561197960265729'],
        courses: [
          {
            courseId: 'c0ffee00-0000-4000-8000-000000000001',
            orderIndex: 1,
            name: 'Main',
            imageUrl: 'https://storage.example/main.jpg',
            mappers: ['76561197960265730'],
            filters: {
              classic: {
                mode: 'classic' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
                notes: null,
              },
              vanilla: {
                mode: 'vanilla' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
                notes: 'Generous curve',
              },
            },
          },
          {
            courseId: 'c0ffee00-0000-4000-8000-000000000002',
            orderIndex: 2,
            name: 'Bonus',
            imageUrl: 'https://storage.example/bonus.jpg',
            mappers: ['76561197960265730'],
            filters: {
              classic: {
                mode: 'classic' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
                notes: null,
              },
              vanilla: {
                mode: 'vanilla' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
                notes: null,
              },
            },
          },
        ],
      },
    ],
  })

  it('renders the ordered manifest into the validated NewMap payload', () => {
    const payload = toReleaseExportPayload(contents())

    expect(payload).toMatchObject([
      {
        name: 'mute',
        workshop_id: 2798160350,
        state: 'approved',
        mappers: ['76561197960265728', '76561197960265729'],
        courses: [
          {
            name: 'Main',
            mappers: ['76561197960265730'],
            filters: {
              classic: {
                nub_tier: 'very-easy',
                pro_tier: 'medium',
                state: 'ranked',
                notes: '',
              },
              vanilla: {
                nub_tier: 'very-easy',
                pro_tier: 'medium',
                state: 'ranked',
                notes: 'Generous curve',
              },
            },
          },
          { name: 'Bonus' },
        ],
      },
    ])
  })

  it('keeps manifest course order and keeps plumbing out of the wire', () => {
    const payload = toReleaseExportPayload(contents())

    // `courseId`, `orderIndex`, `imageUrl` and `mode` are manifest plumbing —
    // none of it leaks into the export; courses stay in manifest order. The
    // key order follows the shared `NewCourseSchema` (name, filters, mappers).
    expect(Object.keys(payload[0]!.courses[0]!)).toEqual([
      'name',
      'filters',
      'mappers',
    ])
    expect(payload[0]!.courses.map((course) => course.name)).toEqual([
      'Main',
      'Bonus',
    ])
  })

  it('refuses a course missing one mode\u2019s finalized filters', () => {
    const incomplete = contents()
    incomplete.maps[0]!.courses[0]!.filters = { classic: null, vanilla: null }

    expect(() => toReleaseExportPayload(incomplete)).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        statusMessage: 'Missing finalized filters for course Main',
      }),
    )
  })

  it('renders an empty release as an empty export', () => {
    expect(toReleaseExportPayload({ releaseName: 'Release One', maps: [] })).toEqual(
      [],
    )
  })
})