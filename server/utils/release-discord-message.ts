import { createError } from 'h3'

import { tierToNumber, type CourseFilterTier } from '~/shared/schemas/cs2kz'
import { modeLabel, modesForGame } from '~/shared/schemas/course-mode'
import type { Game } from '~/shared/schemas/game'
import { gameLabels } from '~/shared/utils/games'
import type { ReleaseContents } from '~/server/services/release-contents'

const ESC = '\u001b'
const RESET = `${ESC}[0m`

/** ANSI colour per tier number, as Discord's `ansi` code block renders it:
 *  green for T1–T2, blue for T3–T4, red for T5–T6, and purple (Discord's
 *  pink/magenta, code 35) for T7–T10. */
function tierColorCode(tierNumber: number): string {
  if (tierNumber <= 2) return '2;32'
  if (tierNumber <= 4) return '2;34'
  if (tierNumber <= 6) return '2;31'
  return '2;35'
}

/** `T5` wrapped in its colour escape, e.g. `\u001b[2;31mT5\u001b[0m`. */
export function colorizeTier(tier: CourseFilterTier): string {
  const n = tierToNumber(tier)
  return `${ESC}[${tierColorCode(n)}mT${n}${RESET}`
}

/** The role mention that opens the announcement. With a configured role id
 *  it is a real `<@&id>` mention that pings when pasted; without one it falls
 *  back to the readable `@CS2 - Server Operator` text, which does not ping. */
export function serverOperatorMention(game: Game, roleId?: string): string {
  const id = roleId?.trim()
  return id ? `<@&${id}>` : `@${gameLabels[game]} - Server Operator`
}

export interface ReleaseDiscordMessageOptions {
  /** The Discord role id of the game's server operators, if configured. */
  serverOperatorRoleId?: string
}

/** Shapes the ordered manifest into the Discord release announcement: one
 *  line per map, in manifest order, carrying the map name, the nub tier of
 *  its first course in the game's first Course mode (CKZ for CS2, KZT for
 *  CS:GO), and its workshop id. A pure adapter over the same resolution as
 *  the JSON export and the image pack (ADR-0012); unlike the export it has no
 *  side effect, so generating it never marks the release exported. */
export function toReleaseDiscordMessage(
  contents: ReleaseContents,
  game: Game,
  options: ReleaseDiscordMessageOptions = {},
): string {
  if (contents.maps.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release has no maps to announce',
    })
  }

  const mode = modesForGame(game)[0]!
  const lines = contents.maps.map((map) => {
    const course = map.courses[0]
    const filter = course?.filters[mode]
    if (!course || !filter) {
      throw createError({
        statusCode: 400,
        statusMessage: `Missing finalized ${modeLabel(mode)} filter for course ${course?.name ?? 'Main'} of ${map.mapName}`,
      })
    }
    return `${map.mapName} (${colorizeTier(filter.nubTier)}):${map.workshopId}`
  })

  return [
    serverOperatorMention(game, options.serverOperatorRoleId),
    '**New map release in approximately 48 hours**',
    '',
    '```ansi',
    ...lines,
    '```',
    '',
    'Thank you,',
    'The Map Approval Team',
  ].join('\n')
}
