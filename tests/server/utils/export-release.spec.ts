import { describe, expect, it } from 'vitest'

import type { ReleaseContents } from '~/server/services/release-contents'
import { toCs2NewMapExport, toReleaseExportPayload } from '~/server/utils/export-release'

describe('toCs2NewMapExport', () => {
  it('matches the map-release JSON template shape', () => {
    const result = toCs2NewMapExport([
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
    const map = toCs2NewMapExport([
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
    const map = toCs2NewMapExport([
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
  /** A CS2-keyed manifest: filters keyed classic/vanilla. */
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
              },
              vanilla: {
                mode: 'vanilla' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
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
              },
              vanilla: {
                mode: 'vanilla' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
              },
            },
          },
        ],
      },
    ],
  })

  /** A CS:GO-keyed manifest: filters keyed kzt/skz/vnl, the three modes of
   *  a CS:GO release's vocabulary. */
  const csgoContents = (): ReleaseContents => ({
    releaseName: 'CS:GO Release Two',
    maps: [
      {
        mapName: 'mute',
        workshopId: 2798160350,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        mappers: ['76561197960265728'],
        courses: [
          {
            courseId: 'c0ffee00-0000-4000-8000-000000000001',
            orderIndex: 1,
            name: 'Main',
            imageUrl: 'https://storage.example/main.jpg',
            mappers: ['76561197960265730'],
            filters: {
              kzt: {
                mode: 'kzt' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
              },
              skz: {
                mode: 'skz' as const,
                nubTier: 'easy' as const,
                proTier: 'hard' as const,
                state: 'pending' as const,
              },
              vnl: {
                mode: 'vnl' as const,
                nubTier: 'medium' as const,
                proTier: 'extreme' as const,
                state: 'ranked' as const,
              },
            },
          },
          {
            courseId: 'c0ffee00-0000-4000-8000-000000000002',
            orderIndex: 2,
            name: 'Bonus 1',
            imageUrl: 'https://storage.example/bonus.jpg',
            mappers: ['76561197960265730'],
            filters: {
              kzt: {
                mode: 'kzt' as const,
                nubTier: 'very-easy' as const,
                proTier: 'medium' as const,
                state: 'ranked' as const,
              },
              skz: {
                mode: 'skz' as const,
                nubTier: 'easy' as const,
                proTier: 'hard' as const,
                state: 'pending' as const,
              },
              vnl: {
                mode: 'vnl' as const,
                nubTier: 'medium' as const,
                proTier: 'extreme' as const,
                state: 'ranked' as const,
              },
            },
          },
        ],
      },
    ],
  })

  it('renders the ordered manifest into the validated NewMap payload', () => {
    const payload = toReleaseExportPayload(contents(), 'cs2')

    // The final-filter notes were purged from the manifest, and the export
    // shaping re-synthesizes the contract's notes key per finalized filter
    // as '' — the same placeholder the documented null→'' coercion emitted
    // before the purge, so the dashboard-facing JSON is byte-identical.
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
                notes: '',
              },
            },
          },
          { name: 'Bonus' },
        ],
      },
    ])
  })

  it('keeps the per-finalized-filter notes key with the placeholder on every course and mode', () => {
    const payload = toReleaseExportPayload(contents(), 'cs2')

    // ADR-0008's externally-versioned contract passes exactly as before: the
    // notes key exists on each finalized filter and holds the placeholder.
    // Filter key order follows the shared snake_case export schema.
    for (const map of payload) {
      for (const course of map.courses) {
        for (const mode of ['classic', 'vanilla'] as const) {
          expect(Object.keys(course.filters[mode])).toEqual([
            'nub_tier',
            'pro_tier',
            'state',
            'notes',
          ])
          expect(course.filters[mode].notes).toBe('')
        }
      }
    }
  })

  it('keeps manifest course order and keeps plumbing out of the wire', () => {
    const payload = toReleaseExportPayload(contents(), 'cs2')

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

    expect(() => toReleaseExportPayload(incomplete, 'cs2')).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        statusMessage: 'Missing finalized filters for course Main',
      }),
    )
  })

  it('renders an empty release as an empty export', () => {
    expect(
      toReleaseExportPayload({ releaseName: 'Release One', maps: [] }, 'cs2'),
    ).toEqual([])
  })

  describe('CS:GO provisional shape', () => {
    it('emits the provisional payload mirroring the CS2 skeleton with kzt/skz/vnl keys', () => {
      const payload = toReleaseExportPayload(csgoContents(), 'csgo')

      // The skeleton mirrors ADR-0008 exactly — name, workshop_id, state
      // forced to approved, mappers, courses(name/filters/mappers) — only
      // the filter keys are the three CS:GO modes instead of classic/vanilla.
      expect(payload).toEqual([
        {
          name: 'mute',
          workshop_id: 2798160350,
          state: 'approved',
          mappers: ['76561197960265728'],
          courses: [
            {
              name: 'Main',
              filters: {
                kzt: {
                  nub_tier: 'very-easy',
                  pro_tier: 'medium',
                  state: 'ranked',
                  notes: '',
                },
                skz: {
                  nub_tier: 'easy',
                  pro_tier: 'hard',
                  state: 'pending',
                  notes: '',
                },
                vnl: {
                  nub_tier: 'medium',
                  pro_tier: 'extreme',
                  state: 'ranked',
                  notes: '',
                },
              },
              mappers: ['76561197960265730'],
            },
            {
              name: 'Bonus 1',
              filters: {
                kzt: {
                  nub_tier: 'very-easy',
                  pro_tier: 'medium',
                  state: 'ranked',
                  notes: '',
                },
                skz: {
                  nub_tier: 'easy',
                  pro_tier: 'hard',
                  state: 'pending',
                  notes: '',
                },
                vnl: {
                  nub_tier: 'medium',
                  pro_tier: 'extreme',
                  state: 'ranked',
                  notes: '',
                },
              },
              mappers: ['76561197960265730'],
            },
          ],
        },
      ])
    })

    it('walks the CS:GO mode vocabulary in order on every course, with the notes placeholder', () => {
      const payload = toReleaseExportPayload(csgoContents(), 'csgo')

      // Filter keys follow the shared CS:GO vocabulary order (KZT, SKZ, VNL);
      // each filter object mirrors the CS2 filter-object keys, with the same
      // notes placeholder the ADR-0008 contract documents.
      for (const map of payload) {
        for (const course of map.courses) {
          expect(Object.keys(course.filters)).toEqual(['kzt', 'skz', 'vnl'])
          for (const mode of ['kzt', 'skz', 'vnl'] as const) {
            expect(Object.keys(course.filters[mode])).toEqual([
              'nub_tier',
              'pro_tier',
              'state',
              'notes',
            ])
            expect(course.filters[mode].notes).toBe('')
          }
        }
      }
    })

    it('keeps manifest course order and keeps plumbing out of the wire', () => {
      const payload = toReleaseExportPayload(csgoContents(), 'csgo')

      // `courseId`, `orderIndex`, `imageUrl` and `mode` are manifest plumbing
      // — none of it leaks into the export; courses stay in manifest order,
      // and the map keys mirror the CS2 skeleton order.
      expect(Object.keys(payload[0]!)).toEqual([
        'name',
        'workshop_id',
        'state',
        'mappers',
        'courses',
      ])
      expect(Object.keys(payload[0]!.courses[0]!)).toEqual([
        'name',
        'filters',
        'mappers',
      ])
      expect(payload[0]!.courses.map((course) => course.name)).toEqual([
        'Main',
        'Bonus 1',
      ])
    })

    it('refuses a course missing any one of the three modes\u2019 finalized filters', () => {
      const incomplete = csgoContents()
      incomplete.maps[0]!.courses[0]!.filters = {
        kzt: {
          mode: 'kzt' as const,
          nubTier: 'very-easy' as const,
          proTier: 'medium' as const,
          state: 'ranked' as const,
        },
        skz: null,
        vnl: {
          mode: 'vnl' as const,
          nubTier: 'medium' as const,
          proTier: 'extreme' as const,
          state: 'ranked' as const,
        },
      }

      expect(() => toReleaseExportPayload(incomplete, 'csgo')).toThrowError(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: 'Missing finalized filters for course Main',
        }),
      )
    })

    it('renders an empty release as an empty export', () => {
      expect(
        toReleaseExportPayload({ releaseName: 'CS:GO Release Two', maps: [] }, 'csgo'),
      ).toEqual([])
    })
  })
})