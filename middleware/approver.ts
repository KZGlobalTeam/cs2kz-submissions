import { coerceGame, gamePath } from '~/shared/utils/games'

export default defineNuxtRouteMiddleware(async (to) => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  const roles = session.value.user?.roles ?? []
  if (!roles.includes('approver') && !roles.includes('lead_approver')) {
    return navigateTo(gamePath(coerceGame(to.params.game), '/submissions'))
  }
})
