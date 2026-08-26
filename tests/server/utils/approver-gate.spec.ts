import { describe, expect, it } from 'vitest'

import { isPlainApprover } from '~/server/utils/approver-gate'

describe('isPlainApprover', () => {
  it('passes a user holding only the approver role', () => {
    expect(isPlainApprover(['approver'])).toBe(true)
  })

  it('rejects a user holding only the lead approver role', () => {
    expect(isPlainApprover(['lead_approver'])).toBe(false)
  })

  it('rejects a user holding both approver and lead approver roles', () => {
    expect(isPlainApprover(['approver', 'lead_approver'])).toBe(false)
    expect(isPlainApprover(['lead_approver', 'approver'])).toBe(false)
  })

  it('rejects a user holding neither role', () => {
    expect(isPlainApprover([])).toBe(false)
  })
})