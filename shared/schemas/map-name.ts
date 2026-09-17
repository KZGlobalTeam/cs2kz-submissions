import { z } from 'zod'

import type { Game } from '~/shared/schemas/game'
import {
  MAP_NAME_MAX_LENGTH,
  mapNameBodyCharsetOk,
  mapNamePrefixListText,
  mapNameWithinMaxLength,
  matchingMapNamePrefix,
} from '~/shared/utils/map-names'

/** The map-name messages, per game: CS2's are verbatim from today's
 *  submission form — the length rule keeps its single-prefix parenthetical.
 *  CS:GO's derive from the shared prefix vocabulary: the prefix sentence
 *  names all four namespaces and there is no single-prefix parenthetical. */
const MAP_NAME_MESSAGES: Record<
  Game,
  { required: string; prefix: string; charset: string; length: string }
> = {
  cs2: {
    required: 'Map name is required',
    prefix: 'Map name must start with `kz_`',
    charset: 'Map name must only contain ASCII alphanumeric characters and underscores',
    length: `Map name must not exceed ${MAP_NAME_MAX_LENGTH} characters (including the \`kz_\` prefix)`,
  },
  csgo: {
    required: 'Map name is required',
    prefix: `Map name must start with ${mapNamePrefixListText('csgo')}`,
    charset: 'Map name must only contain ASCII alphanumeric characters and underscores',
    length: `Map name must not exceed ${MAP_NAME_MAX_LENGTH} characters`,
  },
}

/** The map-name field schema, per game: required, a game-permitted prefix,
 *  an ASCII-alphanumeric/underscore body (a bare prefix has no body, so it
 *  is rejected here), and the 27-char cap. Both the submission form and the
 *  per-game wire schemas consume this one definition, so the UI and the API
 *  can never drift. */
export function mapNameSchemaFor(game: Game) {
  const messages = MAP_NAME_MESSAGES[game]
  return z
    .string()
    .min(1, messages.required)
    .refine(
      // An empty value already fails `min(1)` above — folding the prefix
      // check into it here would add a spurious second issue (this zod
      // version accumulates every check's failure). The empty-string case
      // reports exactly the required message, as today's form did.
      (value) => value.length === 0 || matchingMapNamePrefix(game, value) !== undefined,
      messages.prefix,
    )
    .refine(
      (value) => {
        const prefix = matchingMapNamePrefix(game, value)
        // Without a matching prefix the prefix refine already reported the
        // failure — checking the body here would add a spurious second issue.
        return prefix === undefined || mapNameBodyCharsetOk(value.slice(prefix.length))
      },
      messages.charset,
    )
    .refine((value) => mapNameWithinMaxLength(value), messages.length)
}