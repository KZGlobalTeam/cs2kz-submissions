import { createError, getRouterParam } from 'h3'

import { deleteSubmission } from '~/server/services/submission-content'
import { hasLeadApproverRole } from '~/server/utils/approver-gate'
import { requireAuth } from '~/server/utils/permissions'
import { requireRouteGame } from '~/server/utils/route-game'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  // The route's game is the context the delete is made in; the service
  // refuses a row whose own game differs (opaque 404), so a CS:GO row can
  // never be deleted through the CS2 route.
  const game = requireRouteGame(event)

  const submissionId = getRouterParam(event, 'id')
  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission id is required',
    })
  }

  // Lead approvers keep their unrestricted cleanup capability: they may
  // delete any submission regardless of creator or votes. Everyone else goes
  // through the owner path — the service responds with an opaque 404 for
  // non-creators and a 409 once review has started.
  const canDeleteUnrestricted = hasLeadApproverRole(user.roles)

  return deleteSubmission(
    submissionId,
    canDeleteUnrestricted ? undefined : user.id,
    game,
  )
})