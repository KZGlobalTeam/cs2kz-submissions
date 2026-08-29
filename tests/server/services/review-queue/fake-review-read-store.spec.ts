import { describe, expect, it } from 'vitest'

import { resolveFilters } from '~/server/services/review-queue/types'
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
const OTHER_VIEWER = 'u-other-viewer'

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

describe('fake review read store', () => {
  it('lists only the owner’s submissions for the owner filter', async () => {
    const store = createFakeReadStore(seededDb())

    const rows = await store.listSubmissionsPage(
      resolveFilters({ ownerId: OWNER }),
      { limit: 10, offset: 0, orderBy: 'createdAt' },
    )

    expect(rows.map((row) => row.id)).toEqual(['s1', 's3', 's4'])
  })

  it('combines the status filter with the owner filter', async () => {
    const store = createFakeReadStore(seededDb())

    const rows = await store.listSubmissionsPage(
      resolveFilters({ status: 'approved', ownerId: OWNER }),
      { limit: 10, offset: 0, orderBy: 'createdAt' },
    )

    expect(rows.map((row) => row.id)).toEqual(['s4'])
  })

  it('excludes a submission the viewer has voted on (unvoted = no vote row from that user)', async () => {
    const db = seededDb()
    seedVote(db, vote('s1', VIEWER, 'yes'))
    seedVote(db, vote('s1', OTHER_VIEWER, 'no'))
    seedVote(db, vote('s3', OTHER_VIEWER, 'yes'))
    const store = createFakeReadStore(db)

    const rows = await store.listSubmissionsPage(
      resolveFilters({ unvoted: { userId: VIEWER } }),
      { limit: 10, offset: 0, orderBy: 'createdAt' },
    )

    // s1 is out: VIEWER voted on it. s3 stays in: only OTHER_VIEWER voted.
    expect(rows.map((row) => row.id)).toEqual(['s2', 's3', 's4'])
  })

  it('combines the status filter with the unvoted filter', async () => {
    const db = seededDb()
    seedVote(db, vote('s4', VIEWER, 'yes'))
    const store = createFakeReadStore(db)

    const rows = await store.listSubmissionsPage(
      resolveFilters({ status: 'approved', unvoted: { userId: VIEWER } }),
      { limit: 10, offset: 0, orderBy: 'createdAt' },
    )

    expect(rows).toEqual([])
  })

  it('counts exactly the rows the list matched for the same resolved filters', async () => {
    const db = seededDb()
    seedVote(db, vote('s1', VIEWER, 'yes'))
    const store = createFakeReadStore(db)
    const filters = resolveFilters({ status: 'pending', unvoted: { userId: VIEWER } })

    const rows = await store.listSubmissionsPage(filters, { limit: 10, offset: 0, orderBy: 'createdAt' })
    const total = await store.countSubmissions(filters)

    expect(rows.map((row) => row.id)).toEqual(['s2', 's3'])
    expect(total).toBe(rows.length)
  })

  it('sorts before clipping, so bounds windows land on the ordered list', async () => {
    const db = createFakeReadDb()
    // Seeded oldest-first but listed newest-first: the window must be cut
    // from the ordered list, not from the seed order.
    seedSubmission(db, submission('s1', { createdAt: new Date('2025-01-01T00:00:00.000Z') }))
    seedSubmission(db, submission('s2', { createdAt: new Date('2025-02-01T00:00:00.000Z') }))
    seedSubmission(db, submission('s3', { createdAt: new Date('2025-03-01T00:00:00.000Z') }))
    seedSubmission(db, submission('s4', { createdAt: new Date('2025-04-01T00:00:00.000Z') }))
    seedSubmission(db, submission('s5', { createdAt: new Date('2025-05-01T00:00:00.000Z') }))
    const store = createFakeReadStore(db)

    const page = await store.listSubmissionsPage({}, { limit: 2, offset: 1, orderBy: 'createdAt' })

    // Ordered desc by createdAt: s5, s4, s3, s2, s1 — offset 1, limit 2 → s4, s3.
    expect(page.map((row) => row.id)).toEqual(['s4', 's3'])
  })

  it('orders by createdAt descending when asked', async () => {
    const db = createFakeReadDb()
    seedSubmission(db, submission('older', { createdAt: new Date('2025-01-01T00:00:00.000Z') }))
    seedSubmission(db, submission('newer', { createdAt: new Date('2025-03-01T00:00:00.000Z') }))
    seedSubmission(db, submission('middle', { createdAt: new Date('2025-02-01T00:00:00.000Z') }))
    const store = createFakeReadStore(db)

    const rows = await store.listSubmissionsPage({}, { limit: 10, offset: 0, orderBy: 'createdAt' })

    expect(rows.map((row) => row.id)).toEqual(['newer', 'middle', 'older'])
  })

  it('orders by approvedAt descending when asked, null approvedAt last', async () => {
    const db = createFakeReadDb()
    seedSubmission(db, submission('pending', { status: 'pending', approvedAt: null }))
    seedSubmission(db, submission('approved-1', {
      status: 'approved',
      approvedAt: new Date('2025-05-01T00:00:00.000Z'),
    }))
    seedSubmission(db, submission('approved-2', {
      status: 'approved',
      approvedAt: new Date('2025-06-01T00:00:00.000Z'),
    }))
    const store = createFakeReadStore(db)

    const rows = await store.listSubmissionsPage({}, { limit: 10, offset: 0, orderBy: 'approvedAt' })

    expect(rows.map((row) => row.id)).toEqual(['approved-2', 'approved-1', 'pending'])
  })

  it('returns the projected page row shape (no owner column)', async () => {
    const store = createFakeReadStore(seededDb())

    const [row] = await store.listSubmissionsPage(
      resolveFilters({ ownerId: OWNER }),
      { limit: 1, offset: 0, orderBy: 'createdAt' },
    )

    expect(row).toEqual({
      id: 's1',
      mapName: 'Map s1',
      workshopId: 42,
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=s1',
      status: 'pending',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      approvedAt: null,
    })
  })

  it('lists the named mapper rows for the requested submissions only', async () => {
    const db = seededDb()
    seedMapper(db, mapper('s1', 'Mapper One'))
    seedMapper(db, mapper('s1', 'Mapper Two'))
    seedMapper(db, mapper('s3', 'Mapper Three'))
    const store = createFakeReadStore(db)

    const rows = await store.listMappers(['s1', 's2'])

    expect(rows).toEqual([
      { submissionId: 's1', displayNameSnapshot: 'Mapper One' },
      { submissionId: 's1', displayNameSnapshot: 'Mapper Two' },
    ])
  })

  it('groups vote counts by (submission, approval decision), omitting absent votes', async () => {
    const db = seededDb()
    seedVote(db, vote('s1', 'a1', 'yes'))
    seedVote(db, vote('s1', 'a2', 'yes'))
    seedVote(db, vote('s1', 'a3', 'no'))
    seedVote(db, vote('s2', 'a4', 'yes'))
    const store = createFakeReadStore(db)

    const rows = await store.countVotesByDecision(['s1', 's2', 's3'])

    expect(rows).toEqual([
      { submissionId: 's1', approvalDecision: 'yes', voteCount: 2 },
      { submissionId: 's1', approvalDecision: 'no', voteCount: 1 },
      { submissionId: 's2', approvalDecision: 'yes', voteCount: 1 },
    ])
  })

  it('lists only the given viewer’s own votes', async () => {
    const db = seededDb()
    seedVote(db, vote('s1', VIEWER, 'yes'))
    seedVote(db, vote('s1', OTHER_VIEWER, 'no'))
    seedVote(db, vote('s3', VIEWER, 'no'))
    const store = createFakeReadStore(db)

    const rows = await store.listMyVotes(['s1', 's2', 's3'], VIEWER)

    expect(rows).toEqual([
      { submissionId: 's1', approvalDecision: 'yes' },
      { submissionId: 's3', approvalDecision: 'no' },
    ])
  })

  it('counts courses per submission, omitting submissions without courses', async () => {
    const db = seededDb()
    seedCourse(db, course('s1', 'c1'))
    seedCourse(db, course('s1', 'c2'))
    seedCourse(db, course('s1', 'c3'))
    seedCourse(db, course('s2', 'c4'))
    const store = createFakeReadStore(db)

    const rows = await store.countCourses(['s1', 's3'])

    expect(rows).toEqual([
      { submissionId: 's1', courseCount: 3 },
    ])
  })

  it('returns empty lists for unknown ids', async () => {
    const store = createFakeReadStore(seededDb())

    expect(await store.listMappers(['nope'])).toEqual([])
    expect(await store.countVotesByDecision(['nope'])).toEqual([])
    expect(await store.listMyVotes(['nope'], VIEWER)).toEqual([])
    expect(await store.countCourses(['nope'])).toEqual([])
  })
})