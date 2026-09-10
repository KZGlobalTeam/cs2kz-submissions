import { coerceGame, gamePath } from '~/shared/utils/games'

export default defineNuxtRouteMiddleware(async (to) => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  if (!session.value.authenticated) {
    // Land on the login page of the game the visitor attempted, not the
    // default — the game spine survives an expired session.
    return navigateTo(gamePath(coerceGame(to.params.game), '/'))
  }
})
