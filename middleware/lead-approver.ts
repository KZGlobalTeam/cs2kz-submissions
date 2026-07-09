export default defineNuxtRouteMiddleware(async () => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  if (!session.value.user?.roles.includes('lead_approver')) {
    return navigateTo('/submissions')
  }
})
