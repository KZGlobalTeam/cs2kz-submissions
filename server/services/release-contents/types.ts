import type {
  CourseFilterState,
  CourseFilterTier,
  Mode,
} from '~/shared/schemas/cs2kz'
import type { SubmissionStatus } from '~/shared/types/submission'

/** One Finalized course filter as the resolution reads it. The manifest does
 *  not judge presence — a course may carry one mode's filter and not the
 *  other's (that refusal is an export concern). */
export interface ReleaseFinalFilter {
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  state: CourseFilterState
  notes: string | null
}

/** A finalized-filter row attached to its course (the export renders it; the
 *  pack never reads filters, so it is free to ignore them). */
export type ReleaseFinalFilterRow = ReleaseFinalFilter & { courseId: string }

/** One course in the ordered manifest: identity, position, the image facts
 *  the pack streams, and the finalized filters the export renders. */
export interface ReleaseCourse {
  courseId: string
  orderIndex: number
  name: string
  imageUrl: string
  /** Steam identities in table insertion order. */
  mappers: string[]
  filters: {
    classic: ReleaseFinalFilter | null
    vanilla: ReleaseFinalFilter | null
  }
}

/** One map in the ordered manifest. `status` is deliberately absent: the
 *  resolution only returns approved maps, so approved-by-construction needs
 *  no representation. */
export interface ReleaseMap {
  mapName: string
  workshopId: number
  createdAt: Date
  /** Steam identities in table insertion order. */
  mappers: string[]
  courses: ReleaseCourse[]
}

/** The ordered manifest: the single resolution of a release that both the
 *  JSON export and the image pack render from.
 *
 *  Ordering contract (defined here, once):
 *  - maps by `createdAt` ascending, with `mapName` ascending as a
 *    deterministic tie-break;
 *  - courses by `orderIndex` ascending;
 *  - mappers in table insertion order (no sort).
 */
export interface ReleaseContents {
  releaseName: string
  maps: ReleaseMap[]
}

/** The row facts the resolution reads. The store stays a dumb data accessor;
 *  the resolution owns ordering, the approved-only guard and the assembly. */
export interface ReleaseRow {
  name: string
}

export interface ReleaseMapRow {
  id: string
  mapName: string
  workshopId: number
  createdAt: Date
  status: SubmissionStatus
}

export interface ReleaseCourseRow {
  id: string
  submissionId: string
  orderIndex: number
  name: string
  imageUrl: string
}

export interface ReleaseMapperRow {
  submissionId: string
  steamId64: string
}

export interface ReleaseCourseMapperRow {
  courseId: string
  steamId64: string
}

/** Read-mostly contract the release-contents spine depends on. A real adapter
 *  binds it to the Drizzle HTTP client (`drizzle-store.ts`); the tests bind
 *  an in-memory fake. `markExported` is the one write — owned by the module
 *  for locality, but invoked only by the JSON export handler (ADR-0008). */
export interface ReleaseContentsStore {
  getRelease(releaseId: string): Promise<ReleaseRow | null>
  /** Submission ids linked to the release, in link order. */
  listLinkedSubmissionIds(releaseId: string): Promise<string[]>
  listMaps(submissionIds: string[]): Promise<ReleaseMapRow[]>
  listCourses(submissionIds: string[]): Promise<ReleaseCourseRow[]>
  listMapMappers(submissionIds: string[]): Promise<ReleaseMapperRow[]>
  listCourseMappers(courseIds: string[]): Promise<ReleaseCourseMapperRow[]>
  listFinalFilters(submissionIds: string[]): Promise<ReleaseFinalFilterRow[]>
  /** Records the release as exported (sets `exportedAt`); a no-op on a
   *  missing release, mirroring the pre-module handler behavior. */
  markExported(releaseId: string): Promise<void>
}

export interface ReleaseContentsDeps {
  store: ReleaseContentsStore
}

export interface ReleaseContentsService {
  resolve(releaseId: string): Promise<ReleaseContents>
  markExported(releaseId: string): Promise<void>
}