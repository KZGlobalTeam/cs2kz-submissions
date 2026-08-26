import { describe, expect, it } from 'vitest'

import { ApproverChecklistBodySchema } from '~/shared/schemas/approver-checklist'

/** Builds a raw body cast to `unknown` so deliberately-invalid values can
 *  still reach the schema at runtime. */
function rawBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    checklist: { naming: [true, false], other: [true] },
    note: 'Jumpstat blocks look consistent',
    ...overrides,
  }
}

function parsedChecklist(value: unknown) {
  const result = ApproverChecklistBodySchema.safeParse(value)
  expect(result.success).toBe(true)
  if (!result.success) {
    throw new Error('unreachable')
  }
  return result.data.checklist
}

describe('ApproverChecklistBodySchema', () => {
  it('accepts a checklist with several rule groups and a note', () => {
    const result = ApproverChecklistBodySchema.safeParse(rawBody())
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('unreachable')
    }
    expect(result.data.checklist).toEqual({
      naming: [true, false],
      other: [true],
    })
    expect(result.data.note).toBe('Jumpstat blocks look consistent')
  })

  it('accepts an empty checklist and null note (reset to nothing)', () => {
    const result = ApproverChecklistBodySchema.safeParse(
      rawBody({ checklist: {}, note: null }),
    )
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('unreachable')
    }
    expect(result.data.checklist).toEqual({})
    expect(result.data.note).toBeNull()
  })

  it('accepts loose rule-group keys (including groups with zero rules)', () => {
    const checklist = { naming: [], 'unknown-group': [false, true, false] }
    expect(parsedChecklist(rawBody({ checklist }))).toEqual(checklist)
  })

  it('normalizes empty and whitespace-only notes to null', () => {
    for (const note of ['', '   ', '\t\r\n  ']) {
      const result = ApproverChecklistBodySchema.safeParse(
        rawBody({ note }),
      )
      expect(result.success).toBe(true)
      if (!result.success) {
        throw new Error('unreachable')
      }
      expect(result.data.note).toBeNull()
    }
  })

  it('accepts a null note unchanged', () => {
    const result = ApproverChecklistBodySchema.safeParse(rawBody({ note: null }))
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('unreachable')
    }
    expect(result.data.note).toBeNull()
  })

  it('trims surrounding whitespace from a note', () => {
    const result = ApproverChecklistBodySchema.safeParse(
      rawBody({ note: '  port looks clean  ' }),
    )
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('unreachable')
    }
    expect(result.data.note).toBe('port looks clean')
  })

  it('rejects a checklist that is not an object', () => {
    for (const checklist of ['naming', [true], 42, null, true]) {
      const result = ApproverChecklistBodySchema.safeParse(
        rawBody({ checklist }),
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toEqual([
          expect.objectContaining({ path: ['checklist'] }),
        ])
      }
    }
  })

  it('rejects checklist arrays containing non-boolean values', () => {
    for (const group of [[true, 'yes'], [1], [null], [{}], ['maybe', false]]) {
      const result = ApproverChecklistBodySchema.safeParse(
        rawBody({ checklist: { naming: group as unknown[] } }),
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        // One issue per offending element, pointing at its index.
        expect(result.error.issues.length).toBeGreaterThan(0)
        for (const issue of result.error.issues) {
          expect(issue).toEqual(
            expect.objectContaining({
              code: 'invalid_type',
              expected: 'boolean',
              path: ['checklist', 'naming', expect.any(Number)],
            }),
          )
        }
      }
    }
  })

  it('rejects a note longer than 2000 characters', () => {
    const result = ApproverChecklistBodySchema.safeParse(
      rawBody({ note: 'x'.repeat(2001) }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          path: ['note'],
          message: 'Note must be at most 2000 characters',
        }),
      ])
    }
  })

  it('rejects a note that is not a string', () => {
    const result = ApproverChecklistBodySchema.safeParse(rawBody({ note: 42 }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['note'] }),
      ])
    }
  })

  it('rejects a missing checklist', () => {
    const result = ApproverChecklistBodySchema.safeParse(
      rawBody({ checklist: undefined }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['checklist'] }),
      ])
    }
  })
})