import type { RejectionAttachment } from '~/shared/types/attachment'
import type { SubmissionCreatedFacts } from '~/server/services/notifications/types'
import type {
  SubmissionContentDeps,
  SubmissionContentStore,
  SubmissionContentWrite,
  SubmissionCourseWrite,
  SubmissionMapperWrite,
  SubmissionRecord,
  SubmissionRow,
} from '~/server/services/submission-content/types'
import type { SubmissionInput } from '~/shared/schemas/submission'

/** A submission row as the fake stores it — exactly the store's row shape,
 *  so a change to `SubmissionRow` cannot drift from the fake. */
export type FakeSubmissionRow = SubmissionRow

export interface FakeCourseRow {
  id: string
  orderIndex: number
  name: string
  imageUrl: string
  imageMime: string
  imageWidth: number
  imageHeight: number
  imageSizeBytes: number
}

/** In-memory picture of the tables the submission-content writes touch. The
 *  runner clones it per transaction; a successful write is committed back, a
 *  throw leaves the committed state untouched. */
export interface FakeDb {
  submissions: Map<string, FakeSubmissionRow>
  /** submissionId → mapper rows. */
  mappers: Map<string, SubmissionMapperWrite[]>
  /** submissionId → course rows in `orderIndex` order. */
  courses: Map<string, FakeCourseRow[]>
  /** submissionId → per-course mapper rows, aligned with the courses
   *  array. */
  courseMappers: Map<string, SubmissionMapperWrite[][]>
  /** submissionId → vote count (the ADR-0002 gate's second input). */
  voteCounts: Map<string, number>
  /** submissionId → vote attachment rows (delete sweep). */
  voteAttachments: Map<string, RejectionAttachment[]>
  /** submissionId → decision attachment rows (delete sweep). */
  decisionAttachments: Map<string, RejectionAttachment[]>
}

export function createFakeDb(): FakeDb {
  return {
    submissions: new Map(),
    mappers: new Map(),
    courses: new Map(),
    courseMappers: new Map(),
    voteCounts: new Map(),
    voteAttachments: new Map(),
    decisionAttachments: new Map(),
  }
}

/** A fake submission row with every column set — seeds the rows the gate and
 *  the image lifecycle read. */
export function fakeSubmissionRow(
  overrides: Partial<FakeSubmissionRow> = {},
): FakeSubmissionRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    createdByUserId: '22222222-2222-4222-8222-222222222222',
    status: 'pending',
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=11111',
    workshopId: 11111,
    mapName: 'Test map',
    notes: null,
    isPort: false,
    portAuthorizationImageUrl: null,
    portAuthorizationImageMime: null,
    portAuthorizationImageWidth: null,
    portAuthorizationImageHeight: null,
    portAuthorizationImageSizeBytes: null,
    portNotes: null,
    decisionByUserId: null,
    decisionNotes: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function seedSubmission(db: FakeDb, row: FakeSubmissionRow): void {
  db.submissions.set(row.id, row)
}

/** Seeds course rows (with their image URLs) so the replace's stale-image
 *  diff and the delete's sweep have something to read. */
export function seedCourseRows(
  db: FakeDb,
  submissionId: string,
  urls: string[],
): void {
  db.courses.set(
    submissionId,
    urls.map((url, index) => ({
      id: `course-${submissionId}-${index + 1}`,
      orderIndex: index + 1,
      name: `Course ${index + 1}`,
      imageUrl: url,
      imageMime: 'image/jpeg',
      imageWidth: 1920,
      imageHeight: 1080,
      imageSizeBytes: 2048,
    })),
  )
}

export function seedMappers(
  db: FakeDb,
  submissionId: string,
  mappers: SubmissionMapperWrite[],
): void {
  db.mappers.set(submissionId, [...mappers])
}

/** Per-test store behavior overrides. `getSubmission` lets a test model a
 *  concurrent writer moving the submission between the write starting and
 *  the spine's in-transaction re-read; `updateSubmissionContent` models the
 *  belt-and-braces zero-row result; `replaceCourses` (or `createSubmission`)
 *  models a mid-write failure. */
export interface FakeStoreOptions {
  getSubmission?: (
    submissionId: string,
  ) => Promise<SubmissionRecord | null>
  createSubmission?: (
    createdByUserId: string,
    content: SubmissionContentWrite,
  ) => Promise<FakeSubmissionRow>
  updateSubmissionContent?: (
    submissionId: string,
    content: SubmissionContentWrite,
  ) => Promise<FakeSubmissionRow | null>
  replaceCourses?: (
    submissionId: string,
    courses: SubmissionCourseWrite[],
  ) => Promise<void>
}

export function createFakeStore(
  db: FakeDb,
  options: FakeStoreOptions = {},
): SubmissionContentStore {
  return {
    async getSubmission(submissionId) {
      if (options.getSubmission) {
        return options.getSubmission(submissionId)
      }
      const row = db.submissions.get(submissionId)
      return row
        ? {
            id: row.id,
            status: row.status,
            createdByUserId: row.createdByUserId,
            portAuthorizationImageUrl: row.portAuthorizationImageUrl,
          }
        : null
    },

    async countVotes(submissionId) {
      return db.voteCounts.get(submissionId) ?? 0
    },

    async createSubmission(createdByUserId, content) {
      if (options.createSubmission) {
        return options.createSubmission(createdByUserId, content)
      }
      const id = `submission-${db.submissions.size + 1}`
      const row: FakeSubmissionRow = {
        id,
        createdByUserId,
        status: 'pending',
        ...content,
        decisionByUserId: null,
        decisionNotes: null,
        approvedAt: null,
        rejectedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      db.submissions.set(id, row)
      return row
    },

    async updateSubmissionContent(submissionId, content) {
      if (options.updateSubmissionContent) {
        return options.updateSubmissionContent(submissionId, content)
      }
      const row = db.submissions.get(submissionId)
      if (!row || row.status !== 'pending') {
        return null
      }
      const updated: FakeSubmissionRow = { ...row, ...content }
      db.submissions.set(submissionId, updated)
      return updated
    },

    async replaceMappers(submissionId, mappers) {
      db.mappers.set(submissionId, [...mappers])
    },

    async replaceCourses(submissionId, courses) {
      if (options.replaceCourses) {
        await options.replaceCourses(submissionId, courses)
        return
      }
      db.courses.set(
        submissionId,
        courses.map((course) => ({
          id: `course-${submissionId}-${course.orderIndex}`,
          orderIndex: course.orderIndex,
          name: course.name,
          imageUrl: course.imageUrl,
          imageMime: course.imageMime,
          imageWidth: course.imageWidth,
          imageHeight: course.imageHeight,
          imageSizeBytes: course.imageSizeBytes,
        })),
      )
      db.courseMappers.set(
        submissionId,
        courses.map((course) => course.mappers),
      )
    },

    async listSubmissionImageUrls(submissionId) {
      const portUrl =
        db.submissions.get(submissionId)?.portAuthorizationImageUrl ?? null
      return [
        ...(db.courses.get(submissionId) ?? []).map((course) => course.imageUrl),
        ...(portUrl ? [portUrl] : []),
      ]
    },

    async listSubmissionAttachmentUrls(submissionId) {
      return [
        ...(db.voteAttachments.get(submissionId) ?? []).map((a) => a.url),
        ...(db.decisionAttachments.get(submissionId) ?? []).map((a) => a.url),
      ]
    },

    async deleteSubmissionRow(submissionId) {
      // The DB-level cascade is modeled by dropping the child rows alongside
      // the submission row (the sweep already collected their URLs).
      db.submissions.delete(submissionId)
      db.mappers.delete(submissionId)
      db.courses.delete(submissionId)
      db.courseMappers.delete(submissionId)
    },
  }
}

function commitMap<K, V>(src: Map<K, V>, dst: Map<K, V>): void {
  dst.clear()
  for (const [key, value] of src) dst.set(key, value)
}

function commitScratch(scratch: FakeDb, committed: FakeDb): void {
  // Replace each map wholesale so rows deleted inside the transaction are
  // deleted on the committed side too (delete writes erase rows).
  commitMap(scratch.submissions, committed.submissions)
  commitMap(scratch.mappers, committed.mappers)
  commitMap(scratch.courses, committed.courses)
  commitMap(scratch.courseMappers, committed.courseMappers)
  commitMap(scratch.voteCounts, committed.voteCounts)
  commitMap(scratch.voteAttachments, committed.voteAttachments)
  commitMap(scratch.decisionAttachments, committed.decisionAttachments)
}

/** The pings the recording fake notifier fired, in order — `submissions`
 *  for `createSubmission` (owner edits and lead deletes never appear). */
export interface FakeNotifierLog {
  submissions: SubmissionCreatedFacts[]
}

/** Binds the module under test to the fake: writes apply to a scratch copy
 *  of the db, success commits it back, a throw discards it. Storage
 *  deletions are recorded in the returned `deleted` array and the
 *  submission-created pings in `notified`. */
export function createFakeDeps(
  db: FakeDb,
  options: FakeStoreOptions = {},
): { deps: SubmissionContentDeps; deleted: string[]; notified: FakeNotifierLog } {
  const deleted: string[] = []
  const notified: FakeNotifierLog = { submissions: [] }

  const deps: SubmissionContentDeps = {
    runTransaction: async (fn) => {
      const scratch = structuredClone(db)
      const store = createFakeStore(scratch, options)
      const result = await fn(store)
      commitScratch(scratch, db)
      return result
    },
    deleteStorageObjects: async (urls) => {
      deleted.push(...urls)
    },
    notifySubmissionCreated: async (facts) => {
      notified.submissions.push(facts)
    },
  }

  return { deps, deleted, notified }
}

/** The validated submission-content shape, with all defaults set. Builds a
 *  body that passes `SubmissionInputSchema` so tests exercise the write path
 *  (not the parser). */
export function submissionInput(
  overrides: Partial<SubmissionInput> = {},
): SubmissionInput {
  return {
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567',
    mapName: 'Test map',
    notes: null,
    isPort: false,
    portAuthorizationImage: null,
    portNotes: null,
    mappers: [mapper('76561198000000001', 'First Mapper')],
    courses: [
      course(
        'Course One',
        'https://storage.example/course-images/course-one.jpg',
      ),
    ],
    ...overrides,
  }
}

export function mapper(
  steamId64 = '76561198000000002',
  displayName = 'Mapper Person',
) {
  return { steamId64, displayName }
}

/** A full validated course (fixed 1920×1080 JPG course image). */
export function course(
  name: string,
  imageUrl: string,
  overrides: Partial<SubmissionInput['courses'][number]> = {},
) {
  return {
    name,
    image: courseImage(imageUrl),
    mappers: [mapper('76561198000000003', 'Course Mapper')],
    ...overrides,
  }
}

export function courseImage(url: string): SubmissionInput['courses'][number]['image'] {
  return {
    url,
    mime: 'image/jpeg',
    width: 1920,
    height: 1080,
    sizeBytes: 2048,
  }
}

export function portImage(url: string): NonNullable<SubmissionInput['portAuthorizationImage']> {
  return {
    url,
    mime: 'image/jpeg',
    width: 800,
    height: 600,
    sizeBytes: 1024,
  }
}

export function attachment(url: string): RejectionAttachment {
  return {
    url,
    mime: 'image/png',
    width: 64,
    height: 32,
    sizeBytes: 1024,
  }
}