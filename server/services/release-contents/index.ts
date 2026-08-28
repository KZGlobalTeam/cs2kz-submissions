import { db } from '~/server/utils/db'

import { drizzleStore } from './drizzle-store'
import { createReleaseContentsService } from './resolve-release-contents'

/** Production wiring: the read-mostly store binds to the Drizzle HTTP client
 *  (no transaction needed — resolution is read-only; `markExported` is the
 *  single, deliberate write). */
const releaseContentsService = createReleaseContentsService({
  store: drizzleStore(db()),
})

/** Bound entry point: resolves the ordered manifest backing every artifact
 *  that renders a release (the JSON export and the image pack). */
export function resolveReleaseContents(releaseId: string) {
  return releaseContentsService.resolve(releaseId)
}

/** Bound entry point: records the release as exported. Called only by the
 *  JSON export handler — the image pack never marks a release exported. */
export function markReleaseExported(releaseId: string) {
  return releaseContentsService.markExported(releaseId)
}

export type {
  ReleaseContents,
  ReleaseContentsDeps,
  ReleaseContentsService,
  ReleaseContentsStore,
  ReleaseCourse,
  ReleaseCourseRow,
  ReleaseCourseMapperRow,
  ReleaseFinalFilter,
  ReleaseFinalFilterRow,
  ReleaseMap,
  ReleaseMapRow,
  ReleaseMapperRow,
  ReleaseRow,
} from './types'