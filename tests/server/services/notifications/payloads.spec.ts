import { describe, expect, it } from 'vitest'

import {
  decisionCastPayload,
  EMBED_COLOR,
  SENDER_NAME,
  submissionCreatedPayload,
  voteRecordedPayload,
} from '~/server/services/notifications/payloads'
import type {
  DecisionCastFacts,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
} from '~/server/services/notifications/types'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const SUBMISSION_URL = `https://example.com/submissions/${SUBMISSION_ID}`

function createdFacts(
  overrides: Partial<SubmissionCreatedFacts> = {},
): SubmissionCreatedFacts {
  return {
    submissionId: SUBMISSION_ID,
    submitterUserId: '22222222-2222-4222-8222-222222222222',
    mapName: 'The Spike Rush',
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567',
    isPort: false,
    ...overrides,
  }
}

function createdContext(overrides: { submitterDisplayName?: string; courseCount?: number } = {}) {
  return {
    submitterDisplayName: 'Alice Submitter',
    courseCount: 3,
    ...overrides,
  }
}

function voteFacts(overrides: Partial<VoteRecordedFacts> = {}): VoteRecordedFacts {
  return {
    submissionId: SUBMISSION_ID,
    approverUserId: '33333333-3333-4333-8333-333333333333',
    approvalDecision: 'yes',
    rejectionReason: null,
    ...overrides,
  }
}

function decisionFacts(overrides: Partial<DecisionCastFacts> = {}): DecisionCastFacts {
  return {
    submissionId: SUBMISSION_ID,
    leadUserId: '44444444-4444-4444-8444-444444444444',
    status: 'approved',
    decisionNotes: null,
    ...overrides,
  }
}

describe('submissionCreatedPayload', () => {
  it('builds the settled submission embed: title, blue, sender, submitter/workshop/courses fields, and the link', () => {
    const payload = submissionCreatedPayload(
      createdFacts({ mapName: 'The Spike Rush' }),
      createdContext({ submitterDisplayName: 'Alice Submitter', courseCount: 3 }),
      SUBMISSION_URL,
    )

    expect(payload.username).toBe(SENDER_NAME)
    expect(payload.embeds).toEqual([
      {
        title: 'Submission: The Spike Rush',
        color: EMBED_COLOR.blue,
        url: SUBMISSION_URL,
        fields: [
          { name: 'Submitter', value: 'Alice Submitter', inline: false },
          {
            name: 'Workshop',
            value: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567',
            inline: false,
          },
          { name: 'Courses', value: '3', inline: false },
        ],
      },
    ])
  })

  it('adds a Port flag field only on a port', () => {
    const plain = submissionCreatedPayload(
      createdFacts({ isPort: false }),
      createdContext(),
      SUBMISSION_URL,
    )
    expect(plain.embeds[0]!.fields.map((f) => f.name)).toEqual([
      'Submitter',
      'Workshop',
      'Courses',
    ])

    const port = submissionCreatedPayload(
      createdFacts({ isPort: true }),
      createdContext(),
      SUBMISSION_URL,
    )
    expect(port.embeds[0]!.fields.map((f) => f.name)).toEqual([
      'Submitter',
      'Workshop',
      'Courses',
      'Port',
    ])
    expect(port.embeds[0]!.fields.at(-1)).toEqual({
      name: 'Port',
      value: 'Yes',
      inline: false,
    })
  })

  it('renders the course count as a string', () => {
    const payload = submissionCreatedPayload(
      createdFacts(),
      createdContext({ courseCount: 0 }),
      SUBMISSION_URL,
    )
    expect(payload.embeds[0]!.fields).toContainEqual({
      name: 'Courses',
      value: '0',
      inline: false,
    })
  })
})

describe('voteRecordedPayload', () => {
  it('is green with a YES decision and no rejection field on a yes-vote', () => {
    const payload = voteRecordedPayload(
      voteFacts({ approvalDecision: 'yes', rejectionReason: null }),
      { mapName: 'The Spike Rush', approverDisplayName: 'Bob Approver' },
      SUBMISSION_URL,
    )

    expect(payload.username).toBe(SENDER_NAME)
    expect(payload.embeds).toEqual([
      {
        title: 'Vote: The Spike Rush',
        color: EMBED_COLOR.green,
        url: SUBMISSION_URL,
        fields: [
          { name: 'Approver', value: 'Bob Approver', inline: false },
          { name: 'Decision', value: 'YES', inline: false },
        ],
      },
    ])
  })

  it('is red with a NO decision and the rejection reason on a no-vote', () => {
    const payload = voteRecordedPayload(
      voteFacts({
        approvalDecision: 'no',
        rejectionReason: 'The blocker is broken',
      }),
      { mapName: 'The Spike Rush', approverDisplayName: 'Bob Approver' },
      SUBMISSION_URL,
    )

    expect(payload.embeds[0]!.color).toBe(EMBED_COLOR.red)
    expect(payload.embeds[0]!.fields).toContainEqual({
      name: 'Decision',
      value: 'NO',
      inline: false,
    })
    expect(payload.embeds[0]!.fields).toContainEqual({
      name: 'Rejection reason',
      value: 'The blocker is broken',
      inline: false,
    })
  })

  it('still omits the rejection field if a no-vote ever carried a null reason', () => {
    const payload = voteRecordedPayload(
      voteFacts({ approvalDecision: 'no', rejectionReason: null }),
      { mapName: 'The Spike Rush', approverDisplayName: 'Bob Approver' },
      SUBMISSION_URL,
    )
    expect(payload.embeds[0]!.fields.map((f) => f.name)).toEqual([
      'Approver',
      'Decision',
    ])
  })
})

describe('decisionCastPayload', () => {
  it('is green with an "Approved:" title on approval', () => {
    const payload = decisionCastPayload(
      decisionFacts({ status: 'approved', decisionNotes: 'Great tech' }),
      { mapName: 'The Spike Rush', leadDisplayName: 'Cara Lead' },
      SUBMISSION_URL,
    )

    expect(payload.username).toBe(SENDER_NAME)
    expect(payload.embeds).toEqual([
      {
        title: 'Approved: The Spike Rush',
        color: EMBED_COLOR.green,
        url: SUBMISSION_URL,
        fields: [
          { name: 'Lead approver', value: 'Cara Lead', inline: false },
          { name: 'Decision note', value: 'Great tech', inline: false },
        ],
      },
    ])
  })

  it('is red with a "Rejected:" title on rejection', () => {
    const payload = decisionCastPayload(
      decisionFacts({ status: 'rejected', decisionNotes: 'Falls apart' }),
      { mapName: 'The Spike Rush', leadDisplayName: 'Cara Lead' },
      SUBMISSION_URL,
    )

    expect(payload.embeds[0]!.color).toBe(EMBED_COLOR.red)
    expect(payload.embeds[0]!.title).toBe('Rejected: The Spike Rush')
  })

  it('keeps the Decision note field on a null note, rendered as the none marker', () => {
    // Discord rejects empty embed field values, so a null note never renders
    // as an empty string.
    const payload = decisionCastPayload(
      decisionFacts({ status: 'approved', decisionNotes: null }),
      { mapName: 'The Spike Rush', leadDisplayName: 'Cara Lead' },
      SUBMISSION_URL,
    )
    expect(payload.embeds[0]!.fields).toContainEqual({
      name: 'Decision note',
      value: '—',
      inline: false,
    })
  })
})