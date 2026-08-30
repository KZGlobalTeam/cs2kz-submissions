import type { UserRole } from '~/shared/types/roles'

/** Role predicate for the lead approver's unrestricted cleanup capability:
 *  any user holding the `lead_approver` role may delete any submission
 *  regardless of creator or votes — the delete endpoint passes no owner and
 *  the mutability gate is skipped entirely. A user who also holds
 *  `approver` is still a lead approver; only the explicit role unlocks the
 *  unrestricted path. */
export function hasLeadApproverRole(roles: readonly UserRole[]): boolean {
  return roles.includes('lead_approver')
}