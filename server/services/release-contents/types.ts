import type {
  CourseFilterState,
  CourseFilterTier,
  Mode,
} from '~/shared/schemas/cs2kz'
import type { CourseMode } from '~/shared/schemas/course-mode'
import type { Game } from '~/shared/schemas/game'
import type { SubmissionStatus } from '~/shared/types/submission'

/** One Finalized course filter as the resolution reads it. The manifest does
 *  not judge presence — a course may carry one mode's filter and not the
 *  other's (that refusal is an export concern). No notes: a Finalized filter
 *  carries no reason text after the finalized-reasoning purge; the export
 *  shaping re-synthesizes the placeholder at the edge (ADR-0008). */
export interface ReleaseFinalFilter {
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  state: CourseFilterState
}

/** A finalized-filter row attached to its course (the export renders it; the
 *  pack never reads filters, so it is free to ignore them). */
export type ReleaseFinalFilterRow = ReleaseFinalFilter & { courseId: string }

/** One course's finalized filters, keyed by its release's game's modes — two
 *  keys for a CS2 release (classic, vanilla), three for a CS:GO one (kzt,
 *  skz, vnl). The resolution fills exactly its game's keys, each null when
 *  that mode has no row; a course never carries the other game's modes. The
 *  manifest does not judge presence — a course may carry one mode's filter
 *  and not the others' (that refusal is an export concern). No notes: a
 *  Finalized filter carries no reason text after the finalized-reasoning
 *  purge; the export shaping re-synthesizes the placeholder at the edge
 *  (ADR-0008). */
export type ReleaseCourseFilters = Partial<Record<CourseMode, ReleaseFinalFilter | null>>

/** One course in the ordered manifest: identity, position, the image facts
 *  the pack streams, and the finalized filters the export renders. */
export interface ReleaseCourse {
  courseId: string
  orderIndex: number
  name: string
  imageUrl: string
  /** Steam identities in table insertion order. */
  mappers: string[]
  filters: ReleaseCourseFilters
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
 *  the resolution owns ordering, the approved-only guard and the assembly.
 *  The game is read so the manifest's finalized filters resolve keyed per
 *  the release's own game — the row is truth (the store's WHERE also
 *  refuses a release of any other game than the request's, so the two can
 *  never disagree). */
export interface ReleaseRow {
  name: string
  game: Game
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
  /** The release row of the requested game — a missing release *or* one of
   *  another game returns null, so the resolution answers a 404 either way. */
  getRelease(releaseId: string, game: Game): Promise<ReleaseRow | null>
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
  resolve(releaseId: string, game: Game): Promise<ReleaseContents>
  markExported(releaseId: string): Promise<void>
}
