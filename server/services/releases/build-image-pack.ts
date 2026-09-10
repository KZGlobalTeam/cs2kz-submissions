import { resolveReleaseContents } from '~/server/services/release-contents'
import {
  toImagePackManifest,
  type ReleaseImagePackManifest,
} from '~/server/utils/image-pack'
import type { Game } from '~/shared/schemas/game'

export type { ReleaseImagePackManifest } from '~/server/utils/image-pack'

/** Bound adapter for the image pack: resolves the ordered manifest once,
 *  then shapes it. The approved-only guard, the 404 for an unknown (or
 *  other-game) release and the deterministic ordering all live in the
 *  shared resolution; the pack-builder (`buildImagePack`, an untouched pure
 *  seam) keeps its own empty-release 400.
 *
 *  An empty release yields `maps: []` — the pack-builder turns that into a
 *  clean 400 rather than producing an empty archive. */
export async function buildImagePackManifest(
  releaseId: string,
  game: Game,
): Promise<ReleaseImagePackManifest> {
  return toImagePackManifest(await resolveReleaseContents(releaseId, game))
}
