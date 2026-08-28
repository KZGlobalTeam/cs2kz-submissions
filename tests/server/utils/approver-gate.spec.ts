import { describe, expect, it } from 'vitest'

import {
  hasApproverRole,
  hasLeadApproverRole,
} from '~/server/utils/approver-gate'

describe('hasApproverRole', () => {
  it('passes a user holding only the approver role', () => {
    expect(hasApproverRole(['approver'])).toBe(true)
  })

  it('passes a user holding both approver and lead approver roles', () => {
    expect(hasApproverRole(['approver', 'lead_approver'])).toBe(true)
    expect(hasApproverRole(['lead_approver', 'approver'])).toBe(true)
  })

  it('rejects a lead-only user', () => {
    expect(hasApproverRole(['lead_approver'])).toBe(false)
  })

  it('rejects a user holding neither role', () => {
    expect(hasApproverRole([])).toBe(false)
  })
})

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