import { describe, expect, it } from 'vitest'

import { hasLeadApproverRole } from '~/server/utils/approver-gate'

describe('hasLeadApproverRole', () => {
  it('passes a user holding only the lead approver role', () => {
    expect(hasLeadApproverRole(['lead_approver'])).toBe(true)
  })

  it('passes a user holding both lead approver and approver roles', () => {
    expect(hasLeadApproverRole(['lead_approver', 'approver'])).toBe(true)
    expect(hasLeadApproverRole(['approver', 'lead_approver'])).toBe(true)
  })

  it('rejects an approver-only user', () => {
    expect(hasLeadApproverRole(['approver'])).toBe(false)
  })

  it('rejects a user holding neither role', () => {
    expect(hasLeadApproverRole([])).toBe(false)
  })
})