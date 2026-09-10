import { createError, getRouterParam, type H3Event } from 'h3'

import { GameSchema, type Game } from '~/shared/schemas/game'

/** The game segment every game-scoped API route carries, validated: an
 *  unknown or malformed segment is a 400 before any auth or read runs, so a
 *  typoed or cross-links game path can never degrade into reading another
 *  game's rows. The route is navigation — the value it parses to is what
 *  every read on the request is scoped by. */
export function requireRouteGame(event: H3Event): Game {
  const parsed = GameSchema.safeParse(getRouterParam(event, 'game'))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid game segment',
    })
  }
  return parsed.data
}