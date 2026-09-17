import type { Game } from '~/shared/schemas/game'

/**
 * The map-name vocabulary (CONTEXT.md — Map name prefix): the leading
 * namespace of a Map name, per Game — `kz_` for CS2; CS:GO also accepts
 * `skz_`, `vnl_`, and `kzpro_` (the mover-community namespaces: KZT,
 * SimpleKZ, vanilla, KZPro). Prefixes are lowercase and matched exactly,
 * never case-insensitively: a `skz_`/`vnl_`/`kzpro_` map in a CS2 release
 * would be foreign to the ADR-0008 import contract. The rule is enforced
 * identically by the submission form and the wire schema, so a direct API
 * write with a foreign prefix is a 400.
 */

/** The maximum total length of a map name, whatever the prefix. */
export const MAP_NAME_MAX_LENGTH = 27

/** The accepted map-name prefixes per game. The order matters only for
 *  message composition — prefixes are exact, so `kzpro_…` can never be
 *  mistaken for `kz_`. */
export const MAP_NAME_PREFIXES: Record<Game, readonly string[]> = {
  cs2: ['kz_'],
  csgo: ['kz_', 'skz_', 'vnl_', 'kzpro_'],
}

export function mapNamePrefixesForGame(game: Game): readonly string[] {
  return MAP_NAME_PREFIXES[game]
}

/** The permitted prefix `name` starts with (exact lowercase match), or
 *  undefined when it starts with no permitted prefix. A bare prefix
 *  (`kz_` alone) still matches — the charset rule rejects the empty tail. */
export function matchingMapNamePrefix(game: Game, name: string): string | undefined {
  return mapNamePrefixesForGame(game).find((prefix) => name.startsWith(prefix))
}

/** True when the map-name body (everything after the prefix) is ASCII
 *  alphanumerics and underscores. The `+` rejects an empty tail, so a bare
 *  prefix is not a valid map name. */
export function mapNameBodyCharsetOk(body: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(body)
}

/** True when the full map name fits the length cap, whatever the prefix. */
export function mapNameWithinMaxLength(name: string): boolean {
  return name.length <= MAP_NAME_MAX_LENGTH
}

/** A human-readable rendering of a game's permitted prefix list for message
 *  composition — `one of \`kz_\`` for CS2, `one of \`kz_\`, \`skz_\`,
 *  \`vnl_\`, \`kzpro_\`` for CS:GO. */
export function mapNamePrefixListText(game: Game): string {
  const prefixes = mapNamePrefixesForGame(game).map((prefix) => `\`${prefix}\``)
  return `one of ${prefixes.join(', ')}`
}