export default defineNuxtRouteMiddleware(async () => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  if (!session.value.authenticated) {
    return navigateTo('/')
  }
})
