import { describe, expect, it } from 'vitest'

import { NewMapSchema } from '~/shared/schemas/cs2kz'

describe('submission flow contract', () => {
  it('keeps release payload aligned with schema shape', () => {
    const payload = {
      workshop_id: 1,
      description: null,
      state: 'approved',
      mappers: ['STEAM_1:1:1'],
      courses: [
        {
          name: 'Course 1',
          description: null,
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
    }

    expect(NewMapSchema.safeParse(payload).success).toBe(true)
  })
})
