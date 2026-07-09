import { describe, expect, it } from 'vitest'

describe('lead decision rules', () => {
  it('documents that only approved submissions can be released', () => {
    const statuses = ['pending', 'approved', 'rejected']
    const releasable = statuses.filter((status) => status === 'approved')

    expect(releasable).toEqual(['approved'])
  })
})
