import type { SubmissionCreatedFacts } from '~/server/services/notifications/types'
import type { SubmissionStatus } from '~/shared/types/submission'

/** The submission row facts the guarded-write spine and the image lifecycle
 *  read: the ADR-0002 gate reads `status` and `createdByUserId`, and the
 *  replace/delete sweeps cover `portAuthorizationImageUrl`. */
export interface SubmissionRecord {
  id: string
  status: SubmissionStatus
  createdByUserId: string
  portAuthorizationImageUrl: string | null
}

/** The submission row as created: the full persisted picture the create
 *  endpoint returns, mirroring the DB row the insert yields. */
export interface SubmissionRow extends SubmissionRecord {
  workshopUrl: string
  workshopId: number
  mapName: string
  notes: string | null
  isPort: boolean
  portAuthorizationImageMime: string | null
  portAuthorizationImageWidth: number | null
  portAuthorizationImageHeight: number | null
  portAuthorizationImageSizeBytes: number | null
  portNotes: string | null
  decisionByUserId: string | null
  decisionNotes: string | null
  approvedAt: Date | null
  rejectedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** A mapper row in the wholesale content write. */
export interface SubmissionMapperWrite {
  steamId64: string
  displayNameSnapshot: string
}

/** One Course row in the wholesale content write; `orderIndex` is derived
 *  from the array position by the spine (insert and replace number from 1,
 *  so reordering is a replace). */
export interface SubmissionCourseWrite {
  orderIndex: number
  name: string
  imageUrl: string
  imageMime: string
  imageWidth: number
  imageHeight: number
  imageSizeBytes: number
  mappers: SubmissionMapperWrite[]
}

/** The content columns written onto the submission row, shared by insert and
 *  replace. The port-authorization projection lives here — the 5 meta
 *  columns derived from `isPort` — so the conditional appears exactly once
 *  and cannot drift between the two write paths. */
export interface SubmissionContentWrite {
  workshopUrl: string
  workshopId: number
  mapName: string
  notes: string | null
  isPort: boolean
  portAuthorizationImageUrl: string | null
  portAuthorizationImageMime: string | null
  portAuthorizationImageWidth: number | null
  portAuthorizationImageHeight: number | null
  portAuthorizationImageSizeBytes: number | null
  portNotes: string | null
}

/** Narrow write contract the submission-content spine depends on. A real
 *  adapter binds it to a Drizzle transaction client (`drizzle-store.ts`); the
 *  tests bind an in-memory fake with commit/discard semantics mirroring the
 *  transaction contract. */
export interface SubmissionContentStore {
  /** Fresh read of the submission row, inside the current transaction. */
  getSubmission(submissionId: string): Promise<SubmissionRecord | null>
  /** The submission's vote count — the ADR-0002 gate's second input. */
  countVotes(submissionId: string): Promise<number>
  /** Inserts the submission row at `pending` and returns it. */
  createSubmission(
    createdByUserId: string,
    content: SubmissionContentWrite,
  ): Promise<SubmissionRow>
  /** Rewrites the content columns of the existing row, guarded on the row
   *  still being `pending`: returns the updated row, or null when the guard
   *  matched no row (the belt-and-braces signal). */
  updateSubmissionContent(
    submissionId: string,
    content: SubmissionContentWrite,
  ): Promise<SubmissionRecord | null>
  /** Replaces the submission's mapper rows wholesale. */
  replaceMappers(
    submissionId: string,
    mappers: SubmissionMapperWrite[],
  ): Promise<void>
  /** Replaces the submission's course rows wholesale (deleting the course
   *  rows cascades their per-course mappers; the fresh set is inserted with
   *  `orderIndex` from 1). */
  replaceCourses(
    submissionId: string,
    courses: SubmissionCourseWrite[],
  ): Promise<void>
  /** The image URLs the row currently references: course images and the
   *  port-authorization image. */
  listSubmissionImageUrls(submissionId: string): Promise<string[]>
  /** The vote/decision attachment URLs stored against the submission (the
   *  delete sweep's non-content objects). */
  listSubmissionAttachmentUrls(submissionId: string): Promise<string[]>
  /** Hard-deletes the submission row; related rows cascade at the schema
   *  level. */
  deleteSubmissionRow(submissionId: string): Promise<void>
}

/** Runs a write against a store whose changes commit on resolve and discard
 *  on throw — mirrors the DB transaction contract. */
export type SubmissionContentTransaction = <T>(
  fn: (store: SubmissionContentStore) => Promise<T>,
) => Promise<T>

export interface SubmissionContentDeps {
  runTransaction: SubmissionContentTransaction
  /** Best-effort storage deletion after the write commits — and best-effort
   *  orphan compensation when a write fails; a storage hiccup must never
   *  fail an already-committed save or mask a failed write's error. */
  deleteStorageObjects: (urls: string[]) => Promise<void>
  /** Post-commit Discord submission ping: fires only when a `createSubmission`
   *  write commits, carrying the in-hand create facts (`SubmissionCreatedFacts`);
   *  the notifier resolves the submitter's display name and the course count on
   *  its own post-commit read. Owner edits, lead deletes, failed creates, and
   *  rolled-back writes never ping. The notifier swallows its own failures, so
   *  this never fails the caller. */
  notifySubmissionCreated: (facts: SubmissionCreatedFacts) => Promise<void>
}