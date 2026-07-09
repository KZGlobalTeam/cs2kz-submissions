import type { H3Event } from 'h3'

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
