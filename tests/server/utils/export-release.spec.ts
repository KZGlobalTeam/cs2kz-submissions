import { describe, expect, it } from 'vitest'

import { toReleaseExport } from '~/server/utils/export-release'

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