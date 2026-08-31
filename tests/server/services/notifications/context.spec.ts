import { describe, expect, it } from 'vitest'

import { toNotificationContext } from '~/server/services/notifications/types'

const APPROVER_ID = '33333333-3333-4333-8333-333333333333'
const LEAD_ID = '44444444-4444-4444-8444-444444444444'

describe('toNotificationContext', () => {
  it('returns null when the submission row is gone (a post-commit delete race)', () => {
    expect(toNotificationContext(undefined, 3, [])).toBeNull()
  })

  it('maps the map name, the submitting account display name, and the course count', () => {
    const context = toNotificationContext(
      { mapName: 'The Spike Rush', submitterDisplayName: 'Alice Submitter' },
      4,
      [],
    )

    expect(context).toEqual({
      mapName: 'The Spike Rush',
      submitterDisplayName: 'Alice Submitter',
      courseCount: 4,
      displayNames: {},
    })
  })

  it('maps every requested user id to its stored display name', () => {
    const context = toNotificationContext(
      { mapName: 'The Spike Rush', submitterDisplayName: 'Alice Submitter' },
      0,
      [
        { id: APPROVER_ID, displayName: 'Bob Approver' },
        { id: LEAD_ID, displayName: 'Cara Lead' },
      ],
    )

    expect(context?.displayNames).toEqual({
      [APPROVER_ID]: 'Bob Approver',
      [LEAD_ID]: 'Cara Lead',
    })
  })
})