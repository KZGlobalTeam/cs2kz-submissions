import { listSubmissionsForUser } from '~/server/queries/list-submissions'
import { requireAuth } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return listSubmissionsForUser(user)
})
