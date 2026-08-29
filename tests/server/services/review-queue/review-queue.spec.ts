import { describe, expect, it } from 'vitest'

import { createReviewQueueRead } from '~/server/services/review-queue/review-queue'
import {
  createFakeReadDb,
  createFakeReadStore,
  seedCourse,
  seedMapper,
  seedSubmission,
  seedVote,
  type FakeCourseRow,
  type FakeMapperRow,
  type FakeReadDb,
  type FakeSubmissionRow,
  type FakeVoteRow,
} from './fake-review-read-store'

const OWNER = 'u-owner'
const OTHER_OWNER = 'u-other'
const VIEWER = 'u-viewer'
const OTHER_VOTER = 'u-other-voter'

function submission(
  id: string,
  overrides: Partial<FakeSubmissionRow> = {},
): FakeSubmissionRow {
  return {
    id,
    mapName: `Map ${id}`,
    workshopId: 42,
    workshopUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`,
    status: 'pending',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    approvedAt: null,
    createdByUserId: OWNER,
    ...overrides,
  }
}

function mapper(submissionId: string, displayNameSnapshot: string): FakeMapperRow {
  return { submissionId, displayNameSnapshot }
}

function vote(submissionId: string, approverUserId: string, decision: 'yes' | 'no'): FakeVoteRow {
  return { id: `vote-${submissionId}-${approverUserId}`, submissionId, approverUserId, approvalDecision: decision }
}

function course(submissionId: string, id: string): FakeCourseRow {
  return { id, submissionId }
}

function seededDb(): FakeReadDb {
  const db = createFakeReadDb()
  seedSubmission(db, submission('s1'))
  seedSubmission(db, submission('s2', { createdByUserId: OTHER_OWNER }))
  seedSubmission(db, submission('s3'))
  seedSubmission(db, submission('s4', { status: 'approved' }))
  return db
}

describe('review-queue read module', () => {
  describe('getMinePage', () => {
    it('lists only the owner’s submissions, newest first, total counting the filtered set', async () => {
      const db = seededDb()
      seedSubmission(db, submission('newer', { createdAt: new Date('2025-03-01T00:00:00.000Z') }))
      seedSubmission(db, submission('older', { createdAt: new Date('2024-01-01T00:00:00.000Z') }))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items, total } = await module.getMinePage(
        { ownerId: OWNER },
        { limit: 10, offset: 0 },
      )

      // s2 belongs to the other owner; the rest are OWNER's. The seed rows all
      // share one createdAt, so the stable sort keeps seed order among them.
      expect(items.map((row) => row.id)).toEqual(['newer', 's1', 's3', 's4', 'older'])
      expect(total).toBe(5)
    })

    it('runs the count against the same filters as the list (status + owner)', async () => {
      const db = seededDb()
      seedSubmission(db, submission('s5', { status: 'approved' }))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items, total } = await module.getMinePage(
        { status: 'approved', ownerId: OWNER },
        { limit: 10, offset: 0 },
      )

      expect(items.map((row) => row.id)).toEqual(['s4', 's5'])
      expect(total).toBe(2)
    })

    it('computes voteCount as the yes+no total, zero when no one has voted', async () => {
      const db = seededDb()
      seedVote(db, vote('s1', 'a1', 'yes'))
      seedVote(db, vote('s1', 'a2', 'yes'))
      seedVote(db, vote('s1', 'a3', 'no'))
      seedVote(db, vote('s3', 'a4', 'no'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items } = await module.getMinePage({ ownerId: OWNER }, { limit: 10, offset: 0 })

      expect(items.find((row) => row.id === 's1')?.voteCount).toBe(3)
      expect(items.find((row) => row.id === 's3')?.voteCount).toBe(1)
      // No votes at all — the tally defaults to zero.
      expect(items.find((row) => row.id === 's4')?.voteCount).toBe(0)
    })

    it('serializes the timestamps to ISO strings', async () => {
      const db = seededDb()
      seedSubmission(db, submission('approved', {
        status: 'approved',
        createdAt: new Date('2025-06-01T10:30:00.000Z'),
        approvedAt: new Date('2025-06-15T12:00:00.000Z'),
      }))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items } = await module.getMinePage({ ownerId: OWNER }, { limit: 10, offset: 0 })

      const approved = items.find((row) => row.id === 'approved')!
      expect(approved.createdAt).toBe('2025-06-01T10:30:00.000Z')
      expect(approved.approvedAt).toBe('2025-06-15T12:00:00.000Z')
      const stillPending = items.find((row) => row.id === 's1')!
      expect(stillPending.approvedAt).toBeNull()
    })

    it('clips the page to the bounds after ordering', async () => {
      const db = createFakeReadDb()
      seedSubmission(db, submission('s1', { createdAt: new Date('2025-01-01T00:00:00.000Z') }))
      seedSubmission(db, submission('s2', { createdAt: new Date('2025-02-01T00:00:00.000Z') }))
      seedSubmission(db, submission('s3', { createdAt: new Date('2025-03-01T00:00:00.000Z') }))
      seedSubmission(db, submission('s4', { createdAt: new Date('2025-04-01T00:00:00.000Z') }))
      seedSubmission(db, submission('s5', { createdAt: new Date('2025-05-01T00:00:00.000Z') }))
      const module = createReviewQueueRead(createFakeReadStore(db))

      // Ordered desc by createdAt: s5…s1 — offset 1, limit 2 → s4, s3.
      const { items, total } = await module.getMinePage(
        { ownerId: OWNER },
        { limit: 2, offset: 1 },
      )

      expect(items.map((row) => row.id)).toEqual(['s4', 's3'])
      expect(total).toBe(5)
    })

    it('returns an empty page with the full total when nothing matches', async () => {
      const module = createReviewQueueRead(createFakeReadStore(seededDb()))

      const { items, total } = await module.getMinePage(
        { status: 'rejected', ownerId: OWNER },
        { limit: 10, offset: 0 },
      )

      expect(items).toEqual([])
      expect(total).toBe(0)
    })
  })

  describe('getQueuePage', () => {
    it('projects the full queue row: mappers, tallies, my vote, course count, ISO dates', async () => {
      const db = seededDb()
      seedMapper(db, mapper('s1', 'Mapper One'))
      seedMapper(db, mapper('s1', 'Mapper Two'))
      seedVote(db, vote('s1', 'a1', 'yes'))
      seedVote(db, vote('s1', 'a2', 'yes'))
      seedVote(db, vote('s1', 'a3', 'no'))
      seedVote(db, vote('s3', 'a4', 'no'))
      seedCourse(db, course('s1', 'c1'))
      seedCourse(db, course('s1', 'c2'))
      seedCourse(db, course('s1', 'c3'))
      seedCourse(db, course('s2', 'c4'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items } = await module.getQueuePage(
        { status: 'pending' },
        { limit: 10, offset: 0 },
      )

      // Without a viewer (the bare read) myVote is null on every row and
      // nothing is excluded by the Unvoted predicate; the rows share one
      // createdAt, so the stable sort keeps seed order among them.
      const s1 = items.find((row) => row.id === 's1')!
      expect(s1).toMatchObject({
        mapName: 'Map s1',
        workshopId: 42,
        workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=s1',
        status: 'pending',
        createdAt: '2025-01-01T00:00:00.000Z',
        approvedAt: null,
        mappers: ['Mapper One', 'Mapper Two'],
        yesVotes: 2,
        noVotes: 1,
        myVote: null,
        courseCount: 3,
      })

      const s3 = items.find((row) => row.id === 's3')!
      expect(s3).toMatchObject({
        mappers: [],
        yesVotes: 0,
        noVotes: 1,
        myVote: null,
        courseCount: 0,
      })
    })

    it('applies the unvoted exclusion for a planted viewer, list and total agreeing', async () => {
      const db = seededDb()
      seedVote(db, vote('s1', VIEWER, 'yes'))
      seedVote(db, vote('s2', VIEWER, 'no'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items, total } = await module.getQueuePage(
        { unvoted: { userId: VIEWER } },
        { limit: 10, offset: 0 },
      )

      // s1 and s2 are out: VIEWER voted on both. The survivors keep seed
      // order because they share one createdAt.
      expect(items.map((row) => row.id)).toEqual(['s3', 's4'])
      expect(total).toBe(2)
    })

    it('reports the viewer’s own vote when the queue read carries the viewer id', async () => {
      const db = seededDb()
      seedVote(db, vote('s1', VIEWER, 'yes'))
      seedVote(db, vote('s3', VIEWER, 'no'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      // Identity is decoupled from the Unvoted predicate: a bare queue read
      // that carries viewerId excludes nothing yet still reports myVote,
      // exactly like today's queue read under the authenticated approver.
      const { items } = await module.getQueuePage(
        { status: 'pending', viewerId: VIEWER },
        { limit: 10, offset: 0 },
      )

      expect(items.map((row) => row.id)).toEqual(['s1', 's2', 's3'])
      expect(items.find((row) => row.id === 's1')?.myVote).toBe('yes')
      expect(items.find((row) => row.id === 's2')?.myVote).toBeNull()
      expect(items.find((row) => row.id === 's3')?.myVote).toBe('no')
    })

    it('reports myVote as null for the bare queue read without a viewer', async () => {
      const db = seededDb()
      seedVote(db, vote('s1', VIEWER, 'yes'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items } = await module.getQueuePage(
        { status: 'pending' },
        { limit: 10, offset: 0 },
      )

      // No viewer id reaches the read, so nothing is excluded and no myVote
      // can be computed — the row shape stays intact with myVote null. The
      // rows keep seed order (equal createdAt).
      expect(items.map((row) => row.id)).toEqual(['s1', 's2', 's3'])
      expect(items.every((row) => row.myVote === null)).toBe(true)
    })

    it('reports myVote as null on every row of the unvoted read — the viewer has not voted on any of them', async () => {
      const db = seededDb()
      seedVote(db, vote('s1', VIEWER, 'yes'))
      seedVote(db, vote('s2', VIEWER, 'no'))
      seedVote(db, vote('s1', OTHER_VOTER, 'no'))
      seedVote(db, vote('s3', OTHER_VOTER, 'yes'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items } = await module.getQueuePage(
        { unvoted: { userId: VIEWER } },
        { limit: 10, offset: 0 },
      )

      // The unvoted read excludes exactly the submissions VIEWER voted on, so
      // every row left in the page is one VIEWER has not voted on — myVote is
      // structurally null here, while other voters' tallies still count.
      expect(items.map((row) => row.id)).toEqual(['s3', 's4'])
      expect(items.every((row) => row.myVote === null)).toBe(true)
    })

    it('orders by createdAt desc unless the status filter is approved, when approvedAt wins', async () => {
      const db = createFakeReadDb()
      seedSubmission(db, submission('old-pending', { status: 'pending', createdAt: new Date('2025-01-01T00:00:00.000Z') }))
      seedSubmission(db, submission('new-pending', { status: 'pending', createdAt: new Date('2025-03-01T00:00:00.000Z') }))
      seedSubmission(db, submission('mid-approved', {
        status: 'approved',
        createdAt: new Date('2025-02-01T00:00:00.000Z'),
        approvedAt: new Date('2025-04-01T00:00:00.000Z'),
      }))
      seedSubmission(db, submission('new-approved', {
        status: 'approved',
        createdAt: new Date('2025-02-15T00:00:00.000Z'),
        approvedAt: new Date('2025-05-01T00:00:00.000Z'),
      }))
      seedSubmission(db, submission('unapproved', { status: 'approved', approvedAt: null }))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const byCreatedAt = await module.getQueuePage({}, { limit: 10, offset: 0 })
      expect(byCreatedAt.items.map((row) => row.id)).toEqual([
        'new-pending', 'new-approved', 'mid-approved', 'old-pending', 'unapproved',
      ])

      // The approved status filter switches the clock column to approvedAt
      // (desc, nulls last), exactly as today's queue read does.
      const byApprovedAt = await module.getQueuePage(
        { status: 'approved' },
        { limit: 10, offset: 0 },
      )
      expect(byApprovedAt.items.map((row) => row.id)).toEqual([
        'new-approved', 'mid-approved', 'unapproved',
      ])
    })

    it('clips the page to the bounds and totals the filtered set', async () => {
      const db = seededDb()
      const module = createReviewQueueRead(createFakeReadStore(db))

      // Ordered desc by createdAt with equal seed dates: s1…s4 — offset 1,
      // limit 2 → s2, s3.
      const { items, total } = await module.getQueuePage(
        {},
        { limit: 2, offset: 1 },
      )

      expect(items.map((row) => row.id)).toEqual(['s2', 's3'])
      expect(total).toBe(4)
    })

    it('returns an empty page with the full total when nothing matches', async () => {
      const db = seededDb()
      // VIEWER voted on s4, the only approved submission — the intersection of
      // the status and unvoted filters is empty, and total agrees.
      seedVote(db, vote('s4', VIEWER, 'yes'))
      const module = createReviewQueueRead(createFakeReadStore(db))

      const { items, total } = await module.getQueuePage(
        { status: 'approved', unvoted: { userId: VIEWER } },
        { limit: 10, offset: 0 },
      )

      expect(items).toEqual([])
      expect(total).toBe(0)
    })
  })
})