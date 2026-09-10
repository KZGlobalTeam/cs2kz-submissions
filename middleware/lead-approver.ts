import { coerceGame, gamePath } from '~/shared/utils/games'

export default defineNuxtRouteMiddleware(async (to) => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  if (!session.value.user?.roles.includes('lead_approver')) {
    return navigateTo(gamePath(coerceGame(to.params.game), '/submissions'))
  }
})
