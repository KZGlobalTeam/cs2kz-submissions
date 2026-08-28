import { describe, expect, it } from 'vitest'

import { createSubmissionContentService } from '~/server/services/submission-content/save-submission-content'
import {
  createFakeDb,
  createFakeDeps,
  course,
  fakeSubmissionRow,
  mapper,
  portImage,
  seedCourseRows,
  seedSubmission,
  submissionInput,
} from './fake-submission-content-store'
import type { FakeDb } from './fake-submission-content-store'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const CREATOR_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_USER = '33333333-3333-4333-8333-333333333333'
const OLD_COURSE_URL = 'https://storage.example/course-images/old-a.jpg'
const OLD_OTHER_URL = 'https://storage.example/course-images/old-b.jpg'
const NEW_COURSE_URL = 'https://storage.example/course-images/new-a.jpg'
const KEPT_PORT_URL = 'https://storage.example/port-images/kept.jpg'

/** A pending, owner-created, vote-free submission with old seeded content:
 *  two course images and a stored port image. */
function seededSubmission(
  overrides: Partial<Parameters<typeof fakeSubmissionRow>[0]> = {},
): FakeDb {
  const db = createFakeDb()
  seedSubmission(db, fakeSubmissionRow({
    id: SUBMISSION_ID,
    createdByUserId: CREATOR_ID,
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=11111',
    mapName: 'Old name',
    isPort: true,
    portAuthorizationImageUrl: KEPT_PORT_URL,
    ...overrides,
  }))
  seedCourseRows(db, SUBMISSION_ID, [OLD_COURSE_URL, OLD_OTHER_URL])
  return db
}

describe('updateSubmission', () => {
  it('replaces the content wholesale on the owner path and reports stale URLs for post-commit cleanup', async () => {
    const db = seededSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    // The new content drops `old-a.jpg`, keeps `old-b.jpg` as a carried-over
    // pre-filled edit URL, and adds a fresh upload; the port evidence stays.
    const result = await service.updateSubmission(
      SUBMISSION_ID,
      CREATOR_ID,
      submissionInput({
        mapName: 'New name',
        mappers: [mapper('76561198000000009', 'Replacement Mapper')],
        courses: [
          course('Course A', OLD_OTHER_URL),
          course('Course B', NEW_COURSE_URL),
        ],
        isPort: true,
        portAuthorizationImage: portImage(KEPT_PORT_URL),
      }),
    )

    expect(result).toEqual({ id: SUBMISSION_ID })

    // The submission row is rewritten, the workshop id recomputed from the
    // URL, and the gate-relevant columns untouched.
    const row = db.submissions.get(SUBMISSION_ID)
    expect(row).toMatchObject({ mapName: 'New name', status: 'pending', createdByUserId: CREATOR_ID })

    // Mappers and courses are replaced wholesale, numbered from 1.
    expect(db.mappers.get(SUBMISSION_ID)).toEqual([
      { steamId64: '76561198000000009', displayNameSnapshot: 'Replacement Mapper' },
    ])
    expect(db.courses.get(SUBMISSION_ID)?.map((c) => c.imageUrl)).toEqual([
      OLD_OTHER_URL,
      NEW_COURSE_URL,
    ])
    expect(db.courseMappers.get(SUBMISSION_ID)).toHaveLength(2)

    // Stale cleanup runs after the commit: only the replaced course image is
    // removed — the carried-over URL and the kept port image stay referenced
    // and are not deleted.
    expect(deleted).toEqual([OLD_COURSE_URL])
  })

  it('removes a dropped port-authorization image as stale after commit', async () => {
    const db = seededSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    // The edit converts the submission away from a port: the stored port
    // image is no longer referenced by the new content.
    await service.updateSubmission(
      SUBMISSION_ID,
      CREATOR_ID,
      submissionInput({
        isPort: false,
        portNotes: null,
        portAuthorizationImage: null,
        courses: [course('Course A', OLD_COURSE_URL)],
      }),
    )

    expect(deleted).toEqual([OLD_OTHER_URL, KEPT_PORT_URL])
  })

  it('returns the opaque 404 for a non-creator, writes nothing, and compensates only genuinely new uploads', async () => {
    const db = seededSubmission()
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(
        SUBMISSION_ID,
        OTHER_USER,
        submissionInput({
          courses: [
            course('Course A', OLD_COURSE_URL),
            course('Course B', NEW_COURSE_URL),
          ],
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })

    // Nothing changed for the real row…
    expect(db.submissions.get(SUBMISSION_ID)).toMatchObject({ mapName: 'Old name' })
    expect(db.courses.get(SUBMISSION_ID)?.map((c) => c.imageUrl)).toEqual([
      OLD_COURSE_URL,
      OLD_OTHER_URL,
    ])
    // …and the failed write's orphan compensation removed only the upload no
    // persisted row references, never the carried-over still-referenced URL.
    expect(deleted).toEqual([NEW_COURSE_URL])
  })

  it('conflicts once review has started, writes nothing, and compensates only unreferenced uploads', async () => {
    const db = seededSubmission()
    db.voteCounts.set(SUBMISSION_ID, 1)
    const { deps, deleted } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(
        SUBMISSION_ID,
        CREATOR_ID,
        submissionInput({
          courses: [
            course('Course A', OLD_COURSE_URL),
            course('Course B', NEW_COURSE_URL),
          ],
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Review has started',
    })

    expect(db.submissions.get(SUBMISSION_ID)).toMatchObject({ mapName: 'Old name' })
    expect(db.courses.get(SUBMISSION_ID)?.map((c) => c.imageUrl)).toEqual([
      OLD_COURSE_URL,
      OLD_OTHER_URL,
    ])
    expect(deleted).toEqual([NEW_COURSE_URL])
  })

  it('conflicts for a decided submission even with zero votes', async () => {
    const db = seededSubmission({ status: 'approved' })
    const { deps } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(SUBMISSION_ID, CREATOR_ID, submissionInput()),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Review has started',
    })
    expect(db.courses.get(SUBMISSION_ID)?.length).toBe(2)
  })

  it('fails with a conflict when the submission left pending between the write starting and the in-transaction re-read', async () => {
    const db = seededSubmission()
    // The submission looks pending when the request begins… and a concurrent
    // decision lands before the spine's in-transaction re-read.
    const { deps, deleted } = createFakeDeps(db, {
      getSubmission: async (id) => ({
        id,
        status: 'approved',
        createdByUserId: CREATOR_ID,
        portAuthorizationImageUrl: KEPT_PORT_URL,
      }),
    })
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(
        SUBMISSION_ID,
        CREATOR_ID,
        submissionInput({
          courses: [
            course('Course A', OLD_COURSE_URL),
            course('Course B', NEW_COURSE_URL),
          ],
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Review has started',
    })

    // The loser wrote nothing; only the unreferenced new upload is
    // compensated.
    expect(db.submissions.get(SUBMISSION_ID)).toMatchObject({ mapName: 'Old name' })
    expect(db.courses.get(SUBMISSION_ID)?.map((c) => c.imageUrl)).toEqual([
      OLD_COURSE_URL,
      OLD_OTHER_URL,
    ])
    expect(deleted).toEqual([NEW_COURSE_URL])
  })

  it('a zero-row guarded content update raises a conflict and rolls the whole write back', async () => {
    const db = seededSubmission()
    // The in-transaction re-read sees a pending, vote-free submission, but
    // the guarded content update matches nothing (models the belt-and-braces
    // guard catching a status move between the re-read and the write).
    const { deps, deleted } = createFakeDeps(db, {
      updateSubmissionContent: async () => null,
    })
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(
        SUBMISSION_ID,
        CREATOR_ID,
        submissionInput({
          courses: [
            course('Course A', OLD_COURSE_URL),
            course('Course B', NEW_COURSE_URL),
          ],
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Review has started',
    })

    // The throw discarded the already-written mapper/course replacements.
    expect(db.submissions.get(SUBMISSION_ID)).toMatchObject({ mapName: 'Old name' })
    expect(db.courses.get(SUBMISSION_ID)?.map((c) => c.imageUrl)).toEqual([
      OLD_COURSE_URL,
      OLD_OTHER_URL,
    ])
    expect(deleted).toEqual([NEW_COURSE_URL])
  })

  it('rolls a mid-write failure back and compensates only the unreferenced uploads', async () => {
    const db = seededSubmission()
    const { deps, deleted } = createFakeDeps(db, {
      replaceCourses: async () => {
        throw new Error('course insert failed')
      },
    })
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(
        SUBMISSION_ID,
        CREATOR_ID,
        submissionInput({
          courses: [
            course('Course A', OLD_COURSE_URL),
            course('Course B', NEW_COURSE_URL),
          ],
        }),
      ),
    ).rejects.toThrow('course insert failed')

    // The rolled-back DB still holds the pre-edit content…
    expect(db.submissions.get(SUBMISSION_ID)).toMatchObject({ mapName: 'Old name' })
    expect(db.courses.get(SUBMISSION_ID)?.map((c) => c.imageUrl)).toEqual([
      OLD_COURSE_URL,
      OLD_OTHER_URL,
    ])
    // …and the compensation excluded every carried-over URL the rolled-back
    // state still references, deleting only the fresh upload.
    expect(deleted).toEqual([NEW_COURSE_URL])
  })

  it('returns the opaque 404 for a missing submission and writes nothing', async () => {
    const db = createFakeDb()
    const { deps } = createFakeDeps(db)
    const service = createSubmissionContentService(deps)

    await expect(
      service.updateSubmission(SUBMISSION_ID, CREATOR_ID, submissionInput()),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
    expect(db.submissions.size).toBe(0)
  })
})