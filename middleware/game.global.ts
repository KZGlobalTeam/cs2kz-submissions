import { isGameSegment } from '~/shared/utils/games'

/**
 * Global route guard for the game spine: every page that carries a game
 * segment (`/cs2/…`, `/csgo/…`) must parse it — an unknown or malformed
 * segment is rejected (404) instead of being read as some other context.
 * Routes without a segment (the bare `/` redirect and API routes) are not
 * game pages and pass through untouched.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { game } = to.params
  if (game === undefined) {
    return
  }
  if (!isGameSegment(game)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Unknown game',
    })
  }
})
