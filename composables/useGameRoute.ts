import { computed } from 'vue'

import { coerceGame } from '~/shared/utils/games'
import type { Game } from '~/shared/schemas/game'

/**
 * The game segment of the current route — the value every page under
 * `pages/[game]/…` is scoped by. The bare app shell (login page, bare
 * redirect) has no segment; the `cs2` fallback is defensive only, because
 * the route middleware rejects an unknown segment before any page renders.
 */
export function useGameRoute() {
  const route = useRoute()

  const game = computed<Game>(() => coerceGame(route.params.game))

  return { game, route }
}
