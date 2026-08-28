import { resolveReleaseContents } from '~/server/services/release-contents'
import {
  toImagePackManifest,
  type ReleaseImagePackManifest,
} from '~/server/utils/image-pack'

export type { ReleaseImagePackManifest } from '~/server/utils/image-pack'

/** Bound adapter for the image pack: resolves the ordered manifest once,
 *  then shapes it. The approved-only guard, the 404 for an unknown release
 *  and the deterministic ordering all live in the shared resolution; the
 *  pack-builder (`buildImagePack`, an untouched pure seam) keeps its own
 *  empty-release 400.
 *
 *  An empty release yields `maps: []` — the pack-builder turns that into a
 *  clean 400 rather than producing an empty archive. */
export async function buildImagePackManifest(
  releaseId: string,
): Promise<ReleaseImagePackManifest> {
  return toImagePackManifest(await resolveReleaseContents(releaseId))
}