import { describe, expect, it } from 'vitest'

import { createSubmissionContentService } from '~/server/services/submission-content/save-submission-content'
import {
  createFakeDb,
  createFakeDeps,
  course,
  mapper,
  portImage,
  submissionInput,
} from './fake-submission-content-store'
import type { FakeDb } from './fake-submission-content-store'

const CREATOR_ID = '22222222-2222-4222-8222-222222222222'
const COURSE_A_URL = 'https://storage.example/course-images/a.jpg'
const COURSE_B_URL = 'https://storage.example/course-images/b.jpg'
const PORT_URL = 'https://storage.example/port-images/permission.jpg'

function freshDb(): FakeDb {
  // Insert needs no pre-existing rows.
  return createFakeDb()
}

describe('createSubmission', () => {
  it('inserts the submission at pending with the mappers, courses, and per-course mappers', async () => {
    const db = freshDb()
    const { deps } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    const result = await service.createSubmission(
      CREATOR_ID,
      submissionInput({
        mapName: 'The Spike Rush',
        courses: [
          course('Course A', COURSE_A_URL, { mappers: [mapper('76561198000000003', 'Course Mapper')] }),
          course('Course B', COURSE_B_URL),
        ],
      }),
    )

    const row = db.submissions.get(result.id)
    expect(row).toMatchObject({
      createdByUserId: CREATOR_ID,
      status: 'pending',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567',
      workshopId: 1234567,
      mapName: 'The Spike Rush',
    })
    // The content rows are written through the shared helper: mappers,
    // courses numbered from 1, and per-course mappers in course order.
    expect(db.mappers.get(result.id)).toEqual([
      { steamId64: '76561198000000001', displayNameSnapshot: 'First Mapper' },
    ])
    expect(db.courses.get(result.id)?.map((c) => c.name)).toEqual([
      'Course A',
      'Course B',
    ])
    expect(db.courses.get(result.id)?.map((c) => c.orderIndex)).toEqual([1, 2])
    expect(db.courseMappers.get(result.id)).toEqual([
      [{ steamId64: '76561198000000003', displayNameSnapshot: 'Course Mapper' }],
      [{ steamId64: '76561198000000003', displayNameSnapshot: 'Course Mapper' }],
    ])
  })

  it('writes the port-evidence columns for a port and nulls them for a non-port', async () => {
    const db = freshDb()
    const { deps } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    const port = await service.createSubmission(
      CREATOR_ID,
      submissionInput({
        isPort: true,
        portAuthorizationImage: portImage(PORT_URL),
        portNotes: 'Permission granted by the original author',
      }),
    )
    expect(db.submissions.get(port.id)).toMatchObject({
      isPort: true,
      portAuthorizationImageUrl: PORT_URL,
      portAuthorizationImageMime: 'image/jpeg',
      portAuthorizationImageWidth: 800,
      portAuthorizationImageHeight: 600,
      portAuthorizationImageSizeBytes: 1024,
      portNotes: 'Permission granted by the original author',
    })

    const plain = await service.createSubmission(CREATOR_ID, submissionInput())
    expect(db.submissions.get(plain.id)).toMatchObject({
      isPort: false,
      portAuthorizationImageUrl: null,
      portAuthorizationImageMime: null,
      portAuthorizationImageWidth: null,
      portAuthorizationImageHeight: null,
      portAuthorizationImageSizeBytes: null,
      portNotes: null,
    })
  })

  it('returns a 400 and writes nothing when the workshop id cannot be derived', async () => {
    const db = freshDb()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    // A digit-only id that overflows a safe integer passes the shared
    // schema's refine but fails the module's internal derivation (issue 01).
    await expect(
      service.createSubmission(
        CREATOR_ID,
        submissionInput({
          workshopUrl:
            'https://steamcommunity.com/sharedfiles/filedetails/?id=99999999999999999999',
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid Steam Workshop URL',
    })

    // A derivation failure happens before the transaction: no rows, and no
    // compensation — the caller mistake is surfaced as-is.
    expect(db.submissions.size).toBe(0)
    expect(db.courses.size).toBe(0)
    expect(deleted).toEqual([])
  })

  it('discards the fresh row and deletes every body upload URL when the write fails mid-transaction', async () => {
    const db = freshDb()
    const { deps, deleted } = createFakeDeps(db, {
      replaceCourses: async () => {
        throw new Error('course insert failed')
      },
    })
    const service = createSubmissionContentService(deps)

    await expect(
      service.createSubmission(
        CREATOR_ID,
        submissionInput({
          courses: [course('Course A', COURSE_A_URL), course('Course B', COURSE_B_URL)],
        }),
      ),
    ).rejects.toThrow('course insert failed')

    // The throw rolled the fresh row back: nothing committed.
    expect(db.submissions.size).toBe(0)
    expect(db.mappers.size).toBe(0)
    expect(db.courses.size).toBe(0)
    expect(db.courseMappers.size).toBe(0)

    // Nothing persists yet, so every upload URL the failed body referenced
    // is orphaned and compensated.
    expect(deleted).toEqual([COURSE_A_URL, COURSE_B_URL])
  })

  it('compensates on a failed create too, before the row could exist', async () => {
    const db = freshDb()
    const { deps, deleted } = createFakeDeps(db, {
      createSubmission: async () => {
        throw new Error('submission row insert failed')
      },
    })
    const service = createSubmissionContentService(deps)

    await expect(
      service.createSubmission(CREATOR_ID, submissionInput()),
    ).rejects.toThrow('submission row insert failed')

    expect(db.submissions.size).toBe(0)
    expect(deleted).toEqual(['https://storage.example/course-images/course-one.jpg'])
  })
})