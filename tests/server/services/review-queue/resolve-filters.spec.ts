import { describe, expect, it } from 'vitest'

import {
  resolveFilters,
  type ReviewQueueFilters,
} from '~/server/services/review-queue/types'

describe('resolveFilters', () => {
  it('resolves the owner branch by itself', () => {
    expect(resolveFilters({ ownerId: 'u-owner' })).toEqual({ ownerId: 'u-owner' })
  })

  it('resolves a status with the owner branch', () => {
    expect(resolveFilters({ status: 'approved', ownerId: 'u-owner' })).toEqual({
      status: 'approved',
      ownerId: 'u-owner',
    })
  })

  it('resolves the unvoted branch to the viewer id', () => {
    expect(
      resolveFilters({ status: 'pending', unvoted: { userId: 'u-viewer' } }),
    ).toEqual({ status: 'pending', unvotedUserId: 'u-viewer' })
  })

  it('resolves the queue read without the unvoted filter (no owner, no unvoted)', () => {
    expect(resolveFilters({ status: 'rejected' })).toEqual({ status: 'rejected' })
    expect(resolveFilters({})).toEqual({})
  })

  it('prefers the owner branch when both are present', () => {
    // The union permits the mix (each key lives in one branch), so the
    // resolver must pick deterministically: the owner branch wins.
    expect(
      resolveFilters({ ownerId: 'u-owner', unvoted: { userId: 'u-viewer' } }),
    ).toEqual({ ownerId: 'u-owner' })
  })

  it('type-level rule: unvoted cannot be stated without its user', () => {
    // @ts-expect-error `unvoted` cannot exist without its user
    const filters: ReviewQueueFilters = { unvoted: true }
    expect(filters).toBeDefined()
  })
})