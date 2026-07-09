export const USER_ROLES = ['approver', 'lead_approver'] as const

export type UserRole = (typeof USER_ROLES)[number]

export function isLeadApprover(role: UserRole): boolean {
  return role === 'lead_approver'
}
