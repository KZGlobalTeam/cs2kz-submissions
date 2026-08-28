import type {
  ReleaseContentsStore,
  ReleaseCourseMapperRow,
  ReleaseCourseRow,
  ReleaseFinalFilterRow,
  ReleaseMapperRow,
  ReleaseMapRow,
  ReleaseRow,
} from '~/server/services/release-contents'

/** In-memory picture of the tables the release-contents resolution reads.
 *  The store methods are dumb accessors over these, mirroring the drizzle
 *  bindings: no ordering, no guards. */
export interface FakeReleaseContentsDb {
  releases: Map<string, ReleaseRow>
  /** releaseId → linked submission ids, in link order. */
  links: Map<string, string[]>
  /** submission id → map row. */
  maps: Map<string, ReleaseMapRow>
  courses: Map<string, ReleaseCourseRow>
  mapMappers: ReleaseMapperRow[]
  courseMappers: ReleaseCourseMapperRow[]
  /** Finalized-filter rows, keyed by submission too because the real query
   *  is `inArray(submissionId)`; the store contract exposes just courseId. */
  finalFilters: Array<ReleaseFinalFilterRow & { submissionId: string }>
  /** Release ids that were marked exported, in call order. */
  exported: string[]
}

export function createFakeDb(): FakeReleaseContentsDb {
  return {
    releases: new Map(),
    links: new Map(),
    maps: new Map(),
    courses: new Map(),
    mapMappers: [],
    courseMappers: [],
    finalFilters: [],
    exported: [],
  }
}

export function seedRelease(
  db: FakeReleaseContentsDb,
  releaseId: string,
  name: string,
): void {
  db.releases.set(releaseId, { name })
}

export function seedLink(
  db: FakeReleaseContentsDb,
  releaseId: string,
  submissionIds: string[],
): void {
  db.links.set(releaseId, submissionIds)
}

export function seedMap(
  db: FakeReleaseContentsDb,
  map: ReleaseMapRow,
): void {
  db.maps.set(map.id, map)
}

export function seedCourse(
  db: FakeReleaseContentsDb,
  course: ReleaseCourseRow,
): void {
  db.courses.set(course.id, course)
}

export function seedFinalFilter(
  db: FakeReleaseContentsDb,
  filter: ReleaseFinalFilterRow & { submissionId: string },
): void {
  db.finalFilters.push(filter)
}

/** Per-test store over a seeded fake db. */
export function createFakeStore(db: FakeReleaseContentsDb): ReleaseContentsStore {
  return {
    async getRelease(releaseId) {
      return db.releases.get(releaseId) ?? null
    },
    async listLinkedSubmissionIds(releaseId) {
      return db.links.get(releaseId) ?? []
    },
    async listMaps(submissionIds) {
      return [...db.maps.values()].filter((map) =>
        submissionIds.includes(map.id),
      )
    },
    async listCourses(submissionIds) {
      return [...db.courses.values()].filter((course) =>
        submissionIds.includes(course.submissionId),
      )
    },
    async listMapMappers(submissionIds) {
      return db.mapMappers.filter((mapper) =>
        submissionIds.includes(mapper.submissionId),
      )
    },
    async listCourseMappers(courseIds) {
      return db.courseMappers.filter((mapper) =>
        courseIds.includes(mapper.courseId),
      )
    },
    async listFinalFilters(submissionIds) {
      return db.finalFilters.filter((filter) =>
        submissionIds.includes(filter.submissionId),
      )
    },
    async markExported(releaseId) {
      db.exported.push(releaseId)
    },
  }
}