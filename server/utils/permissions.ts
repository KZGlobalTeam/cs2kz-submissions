import { createError, type H3Event } from 'h3'

import { hasApproverRole } from './approver-gate'
import { requireRole, requireUser } from './auth'

export async function requireAuth(event: H3Event) {
  return requireUser(event)
}

export async function requireApprover(event: H3Event) {
  return requireRole(event, 'approver')
}

export async function requireLeadApprover(event: H3Event) {
  return requireRole(event, 'lead_approver')
}

/** Gate used by the approver-checklist endpoints: the user must hold the
 *  `approver` role — a user who also holds `lead_approver` is still an
 *  approver and may read and write their own checklist. Unlike
 *  `requireApprover`, which deliberately admits lead-only users, this
 *  predicate requires the explicit approver role. */
export async function requireApproverRole(event: H3Event) {
  const user = await requireUser(event)

  if (!hasApproverRole(user.roles)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  return user
}

/** Approver **or** lead approver — used by the rejection-attachment upload
 *  and delete endpoints, where either reviewer role may act. */
export async function requireReviewer(event: H3Event) {
  const user = await requireUser(event)

  if (user.roles.includes('approver') || user.roles.includes('lead_approver')) {
    return user
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
  })
}
