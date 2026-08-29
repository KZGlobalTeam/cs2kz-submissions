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

  it('resolves the unvoted branch to the viewer id (the unvoted user is the viewer)', () => {
    expect(
      resolveFilters({ status: 'pending', unvoted: { userId: 'u-viewer' } }),
    ).toEqual({
      status: 'pending',
      unvotedUserId: 'u-viewer',
      viewerId: 'u-viewer',
    })
  })

  it('resolves the queue read without the unvoted filter (no owner, no unvoted)', () => {
    expect(resolveFilters({ status: 'rejected' })).toEqual({ status: 'rejected' })
    expect(resolveFilters({})).toEqual({})
  })

  it('carries the viewer id through the bare queue read (identity, not a predicate)', () => {
    expect(resolveFilters({ viewerId: 'u-viewer' })).toEqual({ viewerId: 'u-viewer' })
    expect(resolveFilters({ status: 'pending', viewerId: 'u-viewer' })).toEqual({
      status: 'pending',
      viewerId: 'u-viewer',
    })
  })

  it('resolves a mixed unvoted+viewerId value to the unvoted branch (identity = unvoted user)', () => {
    // The union cannot forbid both keys at the type level, so resolution
    // decides: the Unvoted branch wins, and the identity is its user — the
    // exclusion and the myVote identity can never name different users.
    const mixed = {
      unvoted: { userId: 'u-viewer' },
      viewerId: 'u-other',
    } as ReviewQueueFilters
    expect(resolveFilters(mixed)).toEqual({
      unvotedUserId: 'u-viewer',
      viewerId: 'u-viewer',
    })
  })

  it('type-level rule: unvoted cannot be stated without its user', () => {
    // @ts-expect-error `unvoted` cannot exist without its user
    const filters: ReviewQueueFilters = { unvoted: true }
    expect(filters).toBeDefined()
  })

  it('prefers the owner branch when both are present', () => {
    // A mixed value can still arrive at runtime (e.g. from untyped input),
    // so the resolver picks deterministically: the owner branch wins.
    const mixed = { ownerId: 'u-owner', unvoted: { userId: 'u-viewer' } } as ReviewQueueFilters
    expect(resolveFilters(mixed)).toEqual({ ownerId: 'u-owner' })
  })
})