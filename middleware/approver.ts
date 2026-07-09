export default defineNuxtRouteMiddleware(async () => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  const roles = session.value.user?.roles ?? []
  if (!roles.includes('approver') && !roles.includes('lead_approver')) {
    return navigateTo('/submissions')
  }
})
