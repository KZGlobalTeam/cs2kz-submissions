import { describe, expect, it } from 'vitest'

import { toReleaseExport } from '~/server/utils/export-release'

describe('release export', () => {
  it('produces NewMap payloads', () => {
    const result = toReleaseExport([
      {
        workshopId: 123,
        mappers: ['STEAM_1:1:1'],
        courses: [
          {
            name: 'Course 1',
            mappers: ['STEAM_1:1:1'],
            filters: {
              classic: {
                nub_tier: 'medium',
                pro_tier: 'hard',
                state: 'ranked',
                notes: null,
              },
              vanilla: {
                nub_tier: 'easy',
                pro_tier: 'medium',
                state: 'unranked',
                notes: null,
              },
            },
          },
        ],
      },
    ])

    expect(result).toHaveLength(1)
    const [firstResult] = result

    expect(firstResult).toBeDefined()
    if (!firstResult) {
      throw new Error('Expected release export result')
    }

    expect(firstResult.workshop_id).toBe(123)
    expect(firstResult.courses).toHaveLength(1)
  })
})
