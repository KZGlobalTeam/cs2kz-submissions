import { describe, expect, it } from 'vitest'

import type { SubmissionVoteInput } from '~/shared/schemas/review'
import { SubmissionVoteSchema } from '~/shared/schemas/review'
import { createReviewWriteService } from '~/server/services/review-write/save-vote'
import {
  attachmentUrl,
  createFakeDb,
  createFakeDeps,
  seedSubmission,
} from './fake-review-write-store'
import type { FakeDb } from './fake-review-write-store'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const APPROVER_ID = '22222222-2222-4222-8222-222222222222'
const COURSE_ID = 'c0ffee00-0000-4000-8000-000000000000'

function filter(courseId: string, mode: 'classic' | 'vanilla', overrides: Record<string, unknown> = {}) {
  return {
    courseId,
    mode,
    nubTier: 'medium',
    proTier: 'hard',
    isRanked: false,
    notes: null,
    ...overrides,
  } as SubmissionVoteInput['filters'][number]
}

function voteBody(overrides: Partial<SubmissionVoteInput> = {}): SubmissionVoteInput {
  return {
    approvalDecision: 'yes',
    rejectionReason: null,
    rejectionExplanation: null,
    attachments: [],
    filters: [filter('c1', 'classic')],
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

function pendingSubmission(id: string = SUBMISSION_ID): FakeDb {
  const db = createFakeDb()
  seedSubmission(db, { id, status: 'pending' })
  return db
}

describe('saveVote', () => {
  it('creates a vote via the upsert, and a same-approver re-save updates it instead of duplicating', async () => {
    const db = pendingSubmission()
    const { deps } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    const created = await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody())
    expect(db.votes.size).toBe(1)
    expect(created.approvalDecision).toBe('yes')

    const resaved = await service.saveVote(
      SUBMISSION_ID,
      APPROVER_ID,
      voteBody({ approvalDecision: 'no', rejectionReason: 'The blocker is broken' }),
    )
    expect(db.votes.size).toBe(1)
    expect(resaved.id).toBe(created.id)
    expect(resaved.approvalDecision).toBe('no')
    expect(db.votes.get(created.id)?.rejectionReason).toBe('The blocker is broken')
  })

  it('replaces the proposed Course filters wholesale on re-save', async () => {
    const db = pendingSubmission()
    const { deps } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
      filters: [filter('c1', 'classic'), filter('c1', 'vanilla')],
    }))
    const vote = db.votes.values().next().value!
    expect(db.voteFilters.get(vote.id)).toEqual([
      filter('c1', 'classic'),
      filter('c1', 'vanilla'),
    ])

    await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
      filters: [filter('c1', 'classic', { nubTier: 'hard', proTier: 'death' })],
    }))
    expect(db.voteFilters.get(vote.id)).toEqual([
      filter('c1', 'classic', { nubTier: 'hard', proTier: 'death' }),
    ])
  })

  it('replaces attachment rows and lists only the removed URLs for storage deletion', async () => {
    const db = pendingSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)
    const noVote = (keys: string[]) => voteBody({
      approvalDecision: 'no',
      rejectionReason: 'The blocker is broken',
      attachments: keys.map(attachment),
    })

    await service.saveVote(SUBMISSION_ID, APPROVER_ID, noVote(['a.png', 'b.png']))
    expect(deleted).toEqual([])

    await service.saveVote(SUBMISSION_ID, APPROVER_ID, noVote(['b.png', 'c.png']))
    expect(deleted).toEqual([attachmentUrl('a.png')])

    const vote = db.votes.values().next().value!
    expect(db.voteAttachments.get(vote.id)?.map((a) => a.url)).toEqual([
      attachmentUrl('b.png'),
      attachmentUrl('c.png'),
    ])
  })

  it('rejects a whitespace-only rejection reason at the shared body schema', () => {
    // Mirrors the endpoint: parse the body against the shared schema before
    // delegating, so a blank reason never reaches the write.
    const result = SubmissionVoteSchema.safeParse(
      voteBody({
        approvalDecision: 'no',
        rejectionReason: '   ',
        filters: [filter(COURSE_ID, 'classic')],
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Reason for rejection is required when approval decision is No',
          path: ['rejectionReason'],
        }),
      ])
    }
  })

  it('rejects attachments on an approval and writes nothing', async () => {
    const db = pendingSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(
      service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
        attachments: [attachment('a.png')],
      })),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Attachments are only allowed on a rejection',
    })
    expect(db.votes.size).toBe(0)
    expect(db.voteFilters.size).toBe(0)
    expect(db.voteAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('fails without writing rows or deleting storage when the submission left pending between the write starting and the in-transaction re-read', async () => {
    const db = pendingSubmission()
    // The submission is pending when the request begins… and a concurrent
    // finalize lands before the spine's in-transaction re-read.
    const { deps, deleted } = createFakeDeps(db, {
      getSubmission: async (id) => ({ id, status: 'approved' }),
    })
    const service = createReviewWriteService(deps)

    await expect(
      service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody()),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Only pending submissions can be voted on',
    })
    expect(db.votes.size).toBe(0)
    expect(db.voteFilters.size).toBe(0)
    expect(db.voteAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('returns a conflict for a submission that is already decided', async () => {
    const db = createFakeDb()
    seedSubmission(db, { id: SUBMISSION_ID, status: 'rejected' })
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody())).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Only pending submissions can be voted on',
    })
    expect(db.votes.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('returns a 404 for a missing submission and writes nothing', async () => {
    const db = createFakeDb()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody())).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
    expect(db.votes.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('discards the whole write and skips storage compensation when the write step fails', async () => {
    const db = pendingSubmission()
    const { deps, deleted } = createFakeDeps(db, {
      replaceVoteAttachments: async () => {
        throw new Error('storage write failed')
      },
    })
    const service = createReviewWriteService(deps)

    await expect(
      service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
        approvalDecision: 'no',
        rejectionReason: 'The blocker is broken',
        attachments: [attachment('a.png')],
      })),
    ).rejects.toThrow('storage write failed')

    // The transaction rolled back: no committed rows, and the removed-URL
    // computation never reached storage cleanup.
    expect(db.votes.size).toBe(0)
    expect(db.voteFilters.size).toBe(0)
    expect(db.voteAttachments.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('compensates only after a successful commit', async () => {
    const db = pendingSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    const vote = await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
      approvalDecision: 'no',
      rejectionReason: 'The blocker is broken',
      attachments: [attachment('a.png'), attachment('b.png')],
    }))

    // The storage deletion ran only after the rows were committed.
    expect(deleted).toEqual([])
    expect(db.votes.has(vote.id)).toBe(true)
    expect(db.voteAttachments.get(vote.id)).toHaveLength(2)
  })

  it('fires the vote ping once after a successful save, carrying the vote facts', async () => {
    const db = pendingSubmission()
    const { deps, notified } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
      approvalDecision: 'no',
      rejectionReason: 'The blocker is broken',
    }))

    expect(notified.votes).toEqual([
      {
        submissionId: SUBMISSION_ID,
        approverUserId: APPROVER_ID,
        approvalDecision: 'no',
        rejectionReason: 'The blocker is broken',
      },
    ])
    expect(notified.decisions).toEqual([])
  })

  it('re-pings on a same-approver re-save, carrying the changed vote', async () => {
    const db = pendingSubmission()
    const { deps, notified } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody())
    await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
      approvalDecision: 'no',
      rejectionReason: 'The blocker is broken',
    }))

    // A re-ping is the change signal: the upsert re-save re-pings with its
    // (updated) facts, deliberately identical in shape to the first.
    expect(notified.votes).toEqual([
      {
        submissionId: SUBMISSION_ID,
        approverUserId: APPROVER_ID,
        approvalDecision: 'yes',
        rejectionReason: null,
      },
      {
        submissionId: SUBMISSION_ID,
        approverUserId: APPROVER_ID,
        approvalDecision: 'no',
        rejectionReason: 'The blocker is broken',
      },
    ])
  })

  it('never pings on a 404', async () => {
    const db = createFakeDb()
    const { deps, notified } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(
      service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody()),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(notified.votes).toEqual([])
  })

  it('never pings on a 409 — already decided or flipped between read and write', async () => {
    // Already terminal when the request arrives.
    const decided = createFakeDb()
    seedSubmission(decided, { id: SUBMISSION_ID, status: 'approved' })
    const decidedDeps = createFakeDeps(decided)
    const decidedService = createReviewWriteService(decidedDeps.deps)

    await expect(
      decidedService.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody()),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(decidedDeps.notified.votes).toEqual([])

    // The concurrent-writer flip: `pending` when the request starts, terminal
    // by the in-transaction re-read — the write rolls back, nothing pings.
    const raced = pendingSubmission()
    const racedDeps = createFakeDeps(raced, {
      getSubmission: async (id) => ({ id, status: 'rejected' }),
    })
    const racedService = createReviewWriteService(racedDeps.deps)

    await expect(
      racedService.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody()),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(racedDeps.notified.votes).toEqual([])
  })

  it('never pings when the rejection-attachment rules reject the vote', async () => {
    const db = pendingSubmission()
    const { deps, notified } = createFakeDeps(db)
    const service = createReviewWriteService(deps)

    await expect(
      service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
        attachments: [attachment('a.png')],
      })),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(notified.votes).toEqual([])
  })

  it('never pings when the write step throws and the transaction rolls back', async () => {
    const db = pendingSubmission()
    const { deps, notified } = createFakeDeps(db, {
      replaceVoteAttachments: async () => {
        throw new Error('storage write failed')
      },
    })
    const service = createReviewWriteService(deps)

    await expect(
      service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
        approvalDecision: 'no',
        rejectionReason: 'The blocker is broken',
        attachments: [attachment('a.png')],
      })),
    ).rejects.toThrow('storage write failed')
    expect(notified.votes).toEqual([])
  })

  it('pings even when the post-commit storage compensation fails', async () => {
    const db = pendingSubmission()
    const { deps, notified } = createFakeDeps(db, {}, {
      deleteStorageObjects: async () => {
        throw new Error('storage cleanup failed')
      },
    })
    const service = createReviewWriteService(deps)

    const vote = await service.saveVote(SUBMISSION_ID, APPROVER_ID, voteBody({
      approvalDecision: 'no',
      rejectionReason: 'The blocker is broken',
      attachments: [attachment('a.png')],
    }))

    // The committed save still returned, the ping fired regardless of the
    // cleanup outcome, and this vote's removed URL simply leaked to storage.
    expect(vote.id).toBeDefined()
    expect(db.votes.has(vote.id)).toBe(true)
    expect(notified.votes).toHaveLength(1)
  })
})