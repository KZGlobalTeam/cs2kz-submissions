import { describe, expect, it } from 'vitest'

import {
  courseFilterStateValues,
  courseFilterTierValues,
  modeValues,
} from '~/shared/schemas/cs2kz'
import {
  LeadDecisionSchema,
  SubmissionVoteSchema,
  type FinalFilterInput,
  type SubmissionVoteInput,
} from '~/shared/schemas/review'
import {
  courseFilterStateEnum,
  courseFilterTierEnum,
  modeEnum,
} from '~/db/schema/votes'

const COURSE_ID = 'c0ffee00-0000-4000-8000-000000000000'

const voteFilter = {
  courseId: COURSE_ID,
  mode: 'classic',
  nubTier: 'medium',
  proTier: 'hard',
  isRanked: false,
  notes: null,
} as const

function voteBody(overrides: Partial<SubmissionVoteInput> = {}): SubmissionVoteInput {
  return {
    approvalDecision: 'yes',
    rejectionReason: null,
    rejectionExplanation: null,
    attachments: [],
    filters: [voteFilter],
    ...overrides,
  }
}

/** Builds a body cast to `unknown` so deliberately-invalid values can still
 *  reach the schema at runtime. */
function rawVoteBody(overrides: Record<string, unknown>): unknown {
  return { ...voteBody(), ...overrides }
}

function finalFilter(overrides: Partial<FinalFilterInput> = {}): FinalFilterInput {
  return {
    ...voteFilter,
    state: 'ranked',
    ...overrides,
  }
}

function decisionBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    status: 'approved',
    decisionNotes: null,
    attachments: [],
    filters: [finalFilter()],
    ...overrides,
  }
}

describe('SubmissionVoteSchema', () => {
  it('accepts a complete yes vote', () => {
    const result = SubmissionVoteSchema.safeParse(voteBody())
    expect(result.success).toBe(true)
  })

  it('accepts a no vote with a written rejection reason', () => {
    const result = SubmissionVoteSchema.safeParse(
      voteBody({
        approvalDecision: 'no',
        rejectionReason: 'The blocker is broken',
      }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a whitespace-only rejection reason (a rejection needs a written reason)', () => {
    const result = SubmissionVoteSchema.safeParse(
      voteBody({ approvalDecision: 'no', rejectionReason: '   ' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message:
            'Reason for rejection is required when approval decision is No',
          path: ['rejectionReason'],
        }),
      ])
    }
  })

  it('rejects a no vote without a rejection reason', () => {
    const result = SubmissionVoteSchema.safeParse(
      voteBody({ approvalDecision: 'no', rejectionReason: null }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message:
            'Reason for rejection is required when approval decision is No',
          path: ['rejectionReason'],
        }),
      ])
    }
  })

  it('rejects an unknown filter tier with the full ten-tier message', () => {
    const result = SubmissionVoteSchema.safeParse(
      rawVoteBody({
        filters: [{ ...voteFilter, nubTier: 'cake' }],
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message:
            'Invalid option: expected one of "very-easy"|"easy"|"medium"|"advanced"|"hard"|"very-hard"|"extreme"|"death"|"unfeasible"|"impossible"',
          path: ['filters', 0, 'nubTier'],
        }),
      ])
    }
  })

  it('rejects an unknown course mode', () => {
    const result = SubmissionVoteSchema.safeParse(
      rawVoteBody({ filters: [{ ...voteFilter, mode: 'solo' }] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['filters', 0, 'mode'] }),
      ])
    }
  })

  it('rejects a non-UUID course id', () => {
    const result = SubmissionVoteSchema.safeParse(
      rawVoteBody({ filters: [{ ...voteFilter, courseId: 'not-a-uuid' }] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ message: 'Invalid UUID' }),
      ])
    }
  })

  it('fills omission of rejectionExplanation and attachments with defaults', () => {
    const result = SubmissionVoteSchema.safeParse(
      rawVoteBody({ rejectionExplanation: undefined, attachments: undefined }),
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rejectionExplanation).toBeNull()
      expect(result.data.attachments).toEqual([])
    }
  })
})

describe('LeadDecisionSchema', () => {
  it('accepts a complete approval with finalized filters', () => {
    const result = LeadDecisionSchema.safeParse(decisionBody())
    expect(result.success).toBe(true)
  })

  it('accepts a rejection with decision notes and attachments', () => {
    const result = LeadDecisionSchema.safeParse(
      decisionBody({
        status: 'rejected',
        decisionNotes: 'Does not meet the rules',
        attachments: [
          {
            url: 'https://project.supabase.co/storage/v1/object/public/submissions/rejection-attachments/abc.png',
            mime: 'image/png',
            width: 64,
            height: 32,
            sizeBytes: 1024,
          },
        ],
      }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a rejected decision without decision notes', () => {
    const result = LeadDecisionSchema.safeParse(
      decisionBody({ status: 'rejected', decisionNotes: null }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Decision notes are required for rejected submissions',
          path: ['decisionNotes'],
        }),
      ])
    }
  })

  it('rejects a whitespace-only decision note on a rejected decision', () => {
    const result = LeadDecisionSchema.safeParse(
      decisionBody({ status: 'rejected', decisionNotes: '   ' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'Decision notes are required for rejected submissions',
          path: ['decisionNotes'],
        }),
      ])
    }
  })

  it('rejects an unknown finalized filter state', () => {
    const result = LeadDecisionSchema.safeParse(
      decisionBody({ filters: [{ ...finalFilter(), state: 'ranked!' }] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['filters', 0, 'state'] }),
      ])
    }
  })

  it('rejects a non-UUID course id on a finalized filter', () => {
    const result = LeadDecisionSchema.safeParse(
      decisionBody({ filters: [{ ...finalFilter(), courseId: 'nope' }] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ message: 'Invalid UUID' }),
      ])
    }
  })

  it('fills omission of attachments with a default', () => {
    const result = LeadDecisionSchema.safeParse(
      decisionBody({ attachments: undefined }),
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attachments).toEqual([])
    }
  })
})

describe('DB enums derive from the shared value arrays', () => {
  it('courses mode, tier, and state enums match the shared wire values', () => {
    expect(modeEnum.enumValues).toEqual(modeValues)
    expect(courseFilterTierEnum.enumValues).toEqual(courseFilterTierValues)
    expect(courseFilterStateEnum.enumValues).toEqual(courseFilterStateValues)
  })
})