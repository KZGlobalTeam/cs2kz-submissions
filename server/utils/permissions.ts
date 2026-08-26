import { createError, type H3Event } from 'h3'

import { isPlainApprover } from './approver-gate'
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

/** Strict plain-approver gate used by the approver-checklist endpoints. The
 *  user must hold the `approver` role and must not hold `lead_approver` —
 *  unlike `requireApprover`, which deliberately admits lead approvers too. */
export async function requirePlainApprover(event: H3Event) {
  const user = await requireUser(event)

  if (!isPlainApprover(user.roles)) {
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
