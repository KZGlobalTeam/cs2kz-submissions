import type { UserRole } from '~/shared/types/roles'

/**
 * Role predicate for the Approver checklist: any user holding the `approver`
 * role may read and write their own checklist — a user who also holds
 * `lead_approver` is still an approver and sees their own private checklist,
 * never anyone else's. The shared `requireApprover` guard deliberately admits
 * lead-*only* users too (it returns yes on `lead_approver` alone), which the
 * checklist must not, so the endpoints gate on this precise predicate instead
 * of reusing it.
 */
export function hasApproverRole(roles: readonly UserRole[]): boolean {
  return roles.includes('approver')
}