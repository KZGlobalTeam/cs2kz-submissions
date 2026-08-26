import { describe, expect, it } from 'vitest'

import { canMutateSubmission } from '~/server/utils/submission-mutability'

describe('canMutateSubmission', () => {
  it('permits mutation while pending with zero votes', () => {
    expect(canMutateSubmission({ status: 'pending', voteCount: 0 })).toBe(true)
  })

  it('denies mutation the moment any vote exists, either decision', () => {
    expect(canMutateSubmission({ status: 'pending', voteCount: 1 })).toBe(false)
    expect(canMutateSubmission({ status: 'pending', voteCount: 2 })).toBe(false)
  })

  it('denies mutation once a decision has been made, regardless of vote count', () => {
    expect(canMutateSubmission({ status: 'approved', voteCount: 0 })).toBe(false)
    expect(canMutateSubmission({ status: 'approved', voteCount: 3 })).toBe(false)
    expect(canMutateSubmission({ status: 'rejected', voteCount: 0 })).toBe(false)
    expect(canMutateSubmission({ status: 'rejected', voteCount: 5 })).toBe(false)
  })
})