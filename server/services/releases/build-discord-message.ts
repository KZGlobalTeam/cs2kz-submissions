import { resolveReleaseContents } from '~/server/services/release-contents'
import {
  toReleaseDiscordMessage,
  type ReleaseDiscordMessageOptions,
} from '~/server/utils/release-discord-message'
import type { Game } from '~/shared/schemas/game'

/** Bound adapter for the Release announcement: resolves the ordered manifest
 *  once, then shapes it into the Discord message text. Ordering, the
 *  approved-only guard and the 404 for an unknown (or other-game) release
 *  all live in the shared resolution (ADR-0012); the per-map tier pick and
 *  the empty-release refusal live in `toReleaseDiscordMessage`. */
export async function buildReleaseDiscordMessage(
  releaseId: string,
  game: Game,
  options: ReleaseDiscordMessageOptions = {},
): Promise<string> {
  return toReleaseDiscordMessage(
    await resolveReleaseContents(releaseId, game),
    game,
    options,
  )
}
