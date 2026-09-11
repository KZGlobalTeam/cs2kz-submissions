import { resolveReleaseContents } from '~/server/services/release-contents'
import { toReleaseExportPayload } from '~/server/utils/export-release'
import type { Game } from '~/shared/schemas/game'

/** Bound adapter for the JSON export: resolves the ordered manifest once,
 *  then shapes it per the release's game — CS2 keeps the ADR-0008 contract
 *  byte-identical, CS:GO emits the provisional shape. Ordering, the
 *  approved-only guard and the 404 for an unknown (or other-game) release
 *  all live in the shared resolution; the per-game pure shaping and the
 *  missing-filters refusal live in `toReleaseExportPayload`. */
export async function buildReleaseExport(releaseId: string, game: Game) {
  return toReleaseExportPayload(
    await resolveReleaseContents(releaseId, game),
    game,
  )
}
