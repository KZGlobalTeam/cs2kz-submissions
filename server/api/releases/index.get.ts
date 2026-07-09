import { listReleases } from '~/server/queries/list-releases'
import { requireLeadApprover } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  return listReleases()
})
