import type { UserRole } from '~/shared/types/roles'

/**
 * Pure role predicate (ADR 0003): only a *plain* approver — a user holding
 * the `approver` role and not the `lead_approver` role — may read and write
 * an Approver checklist. The shared `requireApprover` guard deliberately
 * admits lead approvers too, which this feature must not, so the checklist
 * endpoints gate on this predicate instead.
 */
export function isPlainApprover(roles: readonly UserRole[]): boolean {
  return roles.includes('approver') && !roles.includes('lead_approver')
}