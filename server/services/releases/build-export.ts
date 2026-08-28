import { resolveReleaseContents } from '~/server/services/release-contents'
import { toReleaseExportPayload } from '~/server/utils/export-release'

/** Bound adapter for the JSON export: resolves the ordered manifest once,
 *  then shapes it. Ordering, the approved-only guard and the 404 for an
 *  unknown release all live in the shared resolution; the pure shaping and
 *  the missing-filters refusal live in `toReleaseExportPayload`. */
export async function buildReleaseExport(releaseId: string) {
  return toReleaseExportPayload(await resolveReleaseContents(releaseId))
}