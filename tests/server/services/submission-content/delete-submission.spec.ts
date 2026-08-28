import { describe, expect, it } from 'vitest'

import { createSubmissionContentService } from '~/server/services/submission-content/save-submission-content'
import {
  attachment,
  createFakeDb,
  createFakeDeps,
  fakeSubmissionRow,
  seedCourseRows,
  seedSubmission,
} from './fake-submission-content-store'
import type { FakeDb } from './fake-submission-content-store'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const CREATOR_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_USER = '33333333-3333-4333-8333-333333333333'
const COURSE_URL = 'https://storage.example/course-images/a.jpg'
const PORT_URL = 'https://storage.example/port-images/permission.jpg'
const VOTE_ATTACHMENT_URL = 'https://storage.example/rejection-attachments/v.png'
const DECISION_ATTACHMENT_URL = 'https://storage.example/rejection-attachments/d.png'

/** A submission with the full stored image set: course images, a
 *  port-authorization image, and vote/decision attachment objects. */
function seededSubmission(
  overrides: Partial<Parameters<typeof fakeSubmissionRow>[0]> = {},
): FakeDb {
  const db = createFakeDb()
  seedSubmission(db, fakeSubmissionRow({
    id: SUBMISSION_ID,
    createdByUserId: CREATOR_ID,
    isPort: true,
    portAuthorizationImageUrl: PORT_URL,
    ...overrides,
  }))
  seedCourseRows(db, SUBMISSION_ID, [COURSE_URL])
  db.voteAttachments.set(SUBMISSION_ID, [attachment(VOTE_ATTACHMENT_URL)])
  db.decisionAttachments.set(SUBMISSION_ID, [attachment(DECISION_ATTACHMENT_URL)])
  return db
}

describe('deleteSubmission', () => {
  it('deletes the row on the owner path and sweeps every stored URL after the commit', async () => {
    const db = seededSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    const result = await service.deleteSubmission(SUBMISSION_ID, CREATOR_ID)

    expect(result).toEqual({ id: SUBMISSION_ID })
    expect(db.submissions.size).toBe(0)
    expect(db.courses.size).toBe(0)
    // The full sweep: course images, the port-authorization image, and the
    // vote/decision attachment objects.
    expect(deleted).toEqual([
      COURSE_URL,
      PORT_URL,
      VOTE_ATTACHMENT_URL,
      DECISION_ATTACHMENT_URL,
    ])
  })

  it('a non-creator on the owner path gets the opaque 404 and nothing is deleted', async () => {
    const db = seededSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.deleteSubmission(SUBMISSION_ID, OTHER_USER),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
    expect(db.submissions.has(SUBMISSION_ID)).toBe(true)
    // Delete has no compensation: a refused delete leaves the submission
    // (and its images) fully in place.
    expect(deleted).toEqual([])
  })

  it('the owner path conflicts once review has started and nothing is deleted', async () => {
    const db = seededSubmission()
    db.voteCounts.set(SUBMISSION_ID, 1)
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.deleteSubmission(SUBMISSION_ID, CREATOR_ID),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Review has started',
    })
    expect(db.submissions.has(SUBMISSION_ID)).toBe(true)
    expect(deleted).toEqual([])
  })

  it('the lead path passes no owner, skips the gate, and still sweeps every URL', async () => {
    // Reviewed (one vote) and decided — a submission the owner could never
    // delete, which the lead approver's unrestricted cleanup still can.
    const db = seededSubmission({ status: 'approved', createdByUserId: OTHER_USER })
    db.voteCounts.set(SUBMISSION_ID, 1)
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    const result = await service.deleteSubmission(SUBMISSION_ID)

    expect(result).toEqual({ id: SUBMISSION_ID })
    expect(db.submissions.size).toBe(0)
    expect(db.courses.size).toBe(0)
    expect(deleted).toEqual([
      COURSE_URL,
      PORT_URL,
      VOTE_ATTACHMENT_URL,
      DECISION_ATTACHMENT_URL,
    ])
  })

  it('returns the opaque 404 for a missing submission on both paths', async () => {
    const db = createFakeDb()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.deleteSubmission(SUBMISSION_ID, CREATOR_ID),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
    await expect(
      service.deleteSubmission(SUBMISSION_ID),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
    expect(deleted).toEqual([])
  })
})