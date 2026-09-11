export default defineNuxtRouteMiddleware(async () => {
  const { session, refreshSession } = useSession()

  if (!session.value.authenticated) {
    await refreshSession()
  }

  if (!session.value.authenticated) {
    // Sign-in is game-neutral: the bare root is the only login page, and the
    // preferred game (a cookie) decides the landing. The attempted game is
    // never preserved — the preferred game always wins, and the user-card
    // switch fixes the context in one click after signing in.
    return navigateTo('/')
  }
})
