import type { Game } from '~/shared/schemas/game'

/** Attach game equality: a release may only carry approved submissions of
 *  its own game — a CS:GO release can never contain a CS2 map, or vice
 *  versa (ADR-0016). A one-line rule, deliberately no module fake: the
 *  attach service consults this predicate and rejects a mismatch with a
 *  400, so even a direct API call cannot create a cross-game release row. */
export function gamesMatch(submissionGame: Game, releaseGame: Game): boolean {
  return submissionGame === releaseGame
}