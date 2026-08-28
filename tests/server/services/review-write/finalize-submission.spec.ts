import { describe, expect, it } from 'vitest'

import type { LeadDecisionInput } from '~/shared/schemas/review'
import { createReviewWriteService } from '~/server/services/review-write/save-vote'
import {
  attachmentUrl,
  createFakeDb,
  createFakeDeps,
  seedSubmission,
} from './fake-review-write-store'
import type { FakeDb } from './fake-review-write-store'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const LEAD_ID = '33333333-3333-4333-8333-333333333333'
const COURSE_ID = 'c0ffee00-0000-4000-8000-000000000000'

function finalFilter(overrides: Record<string, unknown> = {}) {
  return {
    courseId: COURSE_ID,
    mode: 'classic' as const,
    nubTier: 'medium' as const,
    proTier: 'hard' as const,
    state: 'ranked' as const,
    notes: null,
    ...overrides,
  }
}

function decisionBody(
  overrides: Partial<LeadDecisionInput> = {},
): LeadDecisionInput {
  return {
    status: 'approved',
    decisionNotes: null,
    attachments: [],
    filters: [finalFilter()],
    ...overrides,
  }
}

function attachment(key: string) {
  return {
    url: attachmentUrl(key),
    mime: 'image/png' as const,
    width: 64,
    height: 32,
    sizeBytes: 1024,
  }
}

/** Derives `isRanked` the same way the write does, mirroring what the stored
 *  rows must look like after an approval. */
function derivedFilter(overrides: Record<string, unknown> = {}) {
  const state = (overrides.state ?? 'ranked') as 'ranked' | 'unranked' | 'pending'
  return finalFilter({ ...overrides, isRanked: state === 'ranked' })
}

function pendingSubmission(id: string = SUBMISSION_ID): FakeDb {
  const db = createFakeDb()
  seedSubmission(db, { id, status: 'pending' })
  return db
}

describe('finalizeSubmission', () => {
  it('an approval writes the Finalized filters and the terminal status', async () => {
    const db = pendingSubmission()
    const { deps } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    const updated = await service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody({
      filters: [
        finalFilter({ state: 'ranked' }),
        finalFilter({ state: 'unranked' }),
        finalFilter({ state: 'pending' }),
      ],
    }))

    expect(updated.status).toBe('approved')
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('approved')
    // `isRanked` is derived from `state` at write time — the wire sent none.
    expect(db.finalFilters.get(SUBMISSION_ID)).toEqual([
      derivedFilter({ state: 'ranked' }),
      derivedFilter({ state: 'unranked' }),
      derivedFilter({ state: 'pending' }),
    ].map((f) => ({ ...f, resolvedByUserId: LEAD_ID })))
    // An approval leaks no Rejection attachments and no decision rows.
    expect(db.decisionAttachments.size).toBe(0)
  })

  it('a rejection writes the Decision attachments and the terminal status, leaving no Finalized filters', async () => {
    const db = pendingSubmission()
    const { deps } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    const updated = await service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody({
      status: 'rejected',
      decisionNotes: 'Does not meet the rules',
      attachments: [attachment('a.png'), attachment('b.png')],
    }))

    expect(updated.status).toBe('rejected')
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('rejected')
    expect(db.decisionAttachments.get(SUBMISSION_ID)?.map((a) => a.url)).toEqual([
      attachmentUrl('a.png'),
      attachmentUrl('b.png'),
    ])
    // The Finalized filters are cleared — a rejection ends with none.
    expect(db.finalFilters.get(SUBMISSION_ID)).toEqual([])
  })

  it('a rejection without attachments writes no attachment rows but still ends terminal', async () => {
    const db = pendingSubmission()
    const { deps } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    const updated = await service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody({
      status: 'rejected',
      decisionNotes: 'Does not meet the rules',
    }))

    expect(updated.status).toBe('rejected')
    expect(db.decisionAttachments.size).toBe(0)
    expect(db.finalFilters.get(SUBMISSION_ID)).toEqual([])
  })

  it('rejects attachments on an approval and writes nothing', async () => {
    const db = pendingSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(
      service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody({
        attachments: [attachment('a.png')],
      })),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Attachments are only allowed on a rejection',
    })
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('pending')
    expect(db.finalFilters.size).toBe(0)
    expect(db.decisionAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('the concurrent-finalize loser rolls back: the status flipped between the write starting and the in-transaction re-read', async () => {
    const db = pendingSubmission()
    // The submission looks pending when the request begins… and a concurrent
    // finalize lands before the spine's in-transaction re-read.
    const { deps, deleted } = createFakeDeps(db, {
      getSubmission: async (id) => ({ id, status: 'approved' }),
    })
    const service = createReviewWriteService(deps)

    await expect(
      service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody()),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Only pending submissions can be finalized',
    })
    // The loser's filter and attachment writes never committed, the status is
    // still pending from the winner's perspective, and no storage deletion
    // ran (the write failed before compensation).
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('pending')
    expect(db.finalFilters.size).toBe(0)
    expect(db.decisionAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('a second finalize after a Decision errors with a conflict, not an empty 200', async () => {
    const db = createFakeDb()
    seedSubmission(db, { id: SUBMISSION_ID, status: 'rejected' })
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(
      service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody()),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Only pending submissions can be finalized',
    })
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('rejected')
    expect(db.finalFilters.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('a zero-row guarded status update after the in-transaction pass raises a clear error and rolls back', async () => {
    const db = pendingSubmission()
    // The in-transaction re-read sees `pending`, but the guarded terminal
    // update matches nothing (models the belt-and-braces guard catching a
    // status move between the re-read and the write).
    const { deps, deleted } = createFakeDeps(db, {
      completeSubmission: async () => null,
    })
    const service = createReviewWriteService(deps)

    await expect(
      service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody()),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Only pending submissions can be finalized',
    })
    // The throw discarded the already-written Finalized filters.
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('pending')
    expect(db.finalFilters.size).toBe(0)
    expect(db.decisionAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('returns a 404 for a missing submission and writes nothing', async () => {
    const db = createFakeDb()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(
      service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody()),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
    expect(db.finalFilters.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('routes rejection attachments through the same rule surface as the vote path', async () => {
    const db = pendingSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)
    // A URL outside the rejection-attachment prefix fails the shared rules.
    const outside = {
      url: 'https://storage.example/public/port-authorization/x.png',
      mime: 'image/png' as const,
      width: 64,
      height: 32,
      sizeBytes: 1024,
    }

    await expect(
      service.finalizeSubmission(SUBMISSION_ID, LEAD_ID, decisionBody({
        status: 'rejected',
        decisionNotes: 'Does not meet the rules',
        attachments: [outside],
      })),
    ).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(db.submissions.get(SUBMISSION_ID)?.status).toBe('pending')
    expect(db.decisionAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })
})