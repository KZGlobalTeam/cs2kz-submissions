import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  return {
    authenticated: Boolean(user),
    user,
  }
})
