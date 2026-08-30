import { createError, type H3Event } from 'h3'

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
