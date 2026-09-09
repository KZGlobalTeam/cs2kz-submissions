import { describe, expect, it } from 'vitest'

import type { Mode } from '~/shared/schemas/cs2kz'
import type {
  SubmissionDetailCourse,
  SubmissionDetailFinalFilter,
  SubmissionDetailVote,
  SubmissionDetailVoteFilter,
} from '~/shared/types/submission-detail'

import { buildApproverVotesView } from '~/shared/utils/approver-votes-view'

/** A payload-shaped Vote; `approverName` doubles as the stable id so the
 *  fixtures read as their badge attribution. The id/voteId of each row are
 *  rebound to the Vote's own ids after the row's own defaults. */
function vote(
  approverName: string,
  filters: SubmissionDetailVoteFilter[],
): SubmissionDetailVote {
  return {
    id: `vote-${approverName}`,
    submissionId: 'sub-1',
    approverUserId: `user-${approverName}`,
    approvalDecision: 'yes',
    rejectionReason: null,
    approvalNote: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    approverName,
    attachments: [],
    filters: filters.map((filter, index) => ({
      ...filter,
      id: `filter-${approverName}-${index}`,
      voteId: `vote-${approverName}`,
    })),
  }
}

/** A proposed Course-filter row for one Course/mode, defaulting to the vote
 *  form's seeded values (Ranked, tier 1) so tests override only the fields
 *  they make assertions about. */
function filterRow(
  courseId: string,
  mode: Mode,
  overrides: Partial<SubmissionDetailVoteFilter> = {},
): SubmissionDetailVoteFilter {
  return {
    id: 'filter-x',
    voteId: 'vote-x',
    courseId,
    mode,
    nubTier: 'very-easy',
    proTier: 'very-easy',
    isRanked: true,
    notes: null,
    ...overrides,
  }
}

/** A Finalized filter for one Course/mode, defaults at the top of the ten
 *  tier scale so the tier-number mapping asserts real boundaries. */
function finalFilter(
  courseId: string,
  mode: Mode,
  overrides: Partial<SubmissionDetailFinalFilter> = {},
): SubmissionDetailFinalFilter {
  return {
    id: `final-${courseId}-${mode}`,
    submissionId: 'sub-1',
    courseId,
    mode,
    nubTier: 'very-easy',
    proTier: 'easy',
    state: 'ranked',
    isRanked: true,
    notes: null,
    resolvedByUserId: 'user-lead',
    resolvedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function course(
  id: string,
  name: string,
  finalFilters: SubmissionDetailFinalFilter[] = [],
): SubmissionDetailCourse {
  return {
    id,
    submissionId: 'sub-1',
    orderIndex: 1,
    name,
    imageUrl: `https://img.example/${id}.jpg`,
    imageMime: 'image/jpeg',
    imageWidth: 1920,
    imageHeight: 1080,
    imageSizeBytes: 123,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    mappers: [],
    finalFilters,
  }
}

describe('buildApproverVotesView', () => {
  it('builds per-Course, per-mode badge groups: one entry per approver, one Final entry per field', () => {
    const view = buildApproverVotesView(
      [
        course('course-1', 'Aerodrome', [
          finalFilter('course-1', 'classic', {
            nubTier: 'advanced',
            proTier: 'impossible',
            notes: 'Lead alignment',
          }),
        ]),
      ],
      [
        vote('Alice', [
          filterRow('course-1', 'classic', {
            nubTier: 'very-easy',
            proTier: 'easy',
            isRanked: true,
            notes: 'Too easy for nubs',
          }),
        ]),
        vote('Bob', [
          filterRow('course-1', 'classic', {
            nubTier: 'medium',
            proTier: 'death',
            isRanked: false,
            notes: null,
          }),
        ]),
      ],
    )

    expect(view.courses[0]?.courseName).toBe('Aerodrome')
    expect(view.courses[0]?.modes).toEqual([
      {
        mode: 'classic',
        rankedStatus: {
          entries: [
            { approverName: 'Alice', displayValue: 'Ranked' },
            { approverName: 'Bob', displayValue: 'Unranked' },
          ],
          final: { approverName: 'Final', displayValue: 'Ranked' },
        },
        nubTier: {
          entries: [
            { approverName: 'Alice', displayValue: 1 },
            { approverName: 'Bob', displayValue: 3 },
          ],
          final: { approverName: 'Final', displayValue: 4 },
        },
        proTier: {
          entries: [
            { approverName: 'Alice', displayValue: 2 },
            { approverName: 'Bob', displayValue: 8 },
          ],
          final: { approverName: 'Final', displayValue: 10 },
        },
        reasoning: {
          entries: [
            { approverName: 'Alice', displayValue: 'Too easy for nubs' },
          ],
          final: { approverName: 'Final', displayValue: 'Lead alignment' },
        },
      },
    ])
  })

  it('renders the tier scale as numbers 1–10 at both ends', () => {
    const view = buildApproverVotesView(
      [
        course('course-1', 'Aerodrome', [
          finalFilter('course-1', 'classic', {
            nubTier: 'unfeasible',
            proTier: 'impossible',
          }),
        ]),
      ],
      [
        vote('Alice', [
          filterRow('course-1', 'classic', {
            nubTier: 'very-easy',
            proTier: 'very-hard',
          }),
        ]),
      ],
    )

    const classic = view.courses[0]!.modes[0]!
    expect(classic.nubTier.entries[0]).toEqual({
      approverName: 'Alice',
      displayValue: 1,
    })
    expect(classic.proTier.entries[0]).toEqual({
      approverName: 'Alice',
      displayValue: 6,
    })
    expect(classic.nubTier.final).toEqual({
      approverName: 'Final',
      displayValue: 9,
    })
    expect(classic.proTier.final).toEqual({
      approverName: 'Final',
      displayValue: 10,
    })
  })

  it('contributes nothing for a Vote that proposed no filters on a Course (missing cells)', () => {
    const view = buildApproverVotesView(
      [
        course('course-1', 'Aerodrome'),
        course('course-2', 'Catacombs'),
      ],
      [
        // Alice proposes classic only; Bob proposes nothing at all.
        vote('Alice', [
          filterRow('course-1', 'classic', { isRanked: false }),
        ]),
        vote('Bob', []),
      ],
    )

    // course-2 receives nothing from either Vote — no modes, no badges.
    expect(view.courses[1]).toEqual({
      courseId: 'course-2',
      courseName: 'Catacombs',
      courseImageUrl: 'https://img.example/course-2.jpg',
      modes: [],
    })

    // On course-1, the vanilla cell is silent: Alice's classic proposal does
    // not leak across modes.
    expect(view.courses[0]!.modes).toEqual([
      {
        mode: 'classic',
        rankedStatus: {
          entries: [
            { approverName: 'Alice', displayValue: 'Unranked' },
          ],
          final: null,
        },
        nubTier: {
          entries: [{ approverName: 'Alice', displayValue: 1 }],
          final: null,
        },
        proTier: {
          entries: [{ approverName: 'Alice', displayValue: 1 }],
          final: null,
        },
        reasoning: {
          entries: [],
          final: null,
        },
      },
    ])
  })

  it('omits empty reasoning but preserves written text untouched', () => {
    const view = buildApproverVotesView(
      [course('course-1', 'Aerodrome')],
      [
        vote('NoNote', [
          filterRow('course-1', 'classic', { notes: null }),
        ]),
        vote('BlankNote', [
          filterRow('course-1', 'classic', { notes: '' }),
        ]),
        vote('SpaceNote', [
          filterRow('course-1', 'classic', { notes: '   ' }),
        ]),
        vote('Written', [
          filterRow('course-1', 'classic', { notes: '  jumpstat is brutal  ' }),
        ]),
      ],
    )

    // Null, empty, and whitespace-only notes are not reasoning.
    expect(view.courses[0]!.modes[0]!.reasoning.entries).toEqual([
      { approverName: 'Written', displayValue: '  jumpstat is brutal  ' },
    ])
  })

  it('carries no Final badge when the Course has no Finalized filter for the mode', () => {
    // A rejected submission never carries Finalized filters, so its modes
    // render proposal badges only.
    const view = buildApproverVotesView(
      [course('course-1', 'Aerodrome')],
      [
        vote('Alice', [
          filterRow('course-1', 'classic', {
            nubTier: 'hard',
            proTier: 'extreme',
          }),
        ]),
      ],
    )

    const classic = view.courses[0]!.modes[0]!
    expect(classic.rankedStatus.final).toBeNull()
    expect(classic.nubTier.final).toBeNull()
    expect(classic.proTier.final).toBeNull()
    expect(classic.reasoning.final).toBeNull()
  })

  it('mixes Final badges per mode: finalized modes carry them, vote-only modes do not', () => {
    // Approved, but only classic finalized; a Vote proposed vanilla.
    const view = buildApproverVotesView(
      [
        course('course-1', 'Aerodrome', [
          finalFilter('course-1', 'classic', { notes: 'Settled' }),
        ]),
      ],
      [
        vote('Alice', [
          filterRow('course-1', 'vanilla', { isRanked: false }),
        ]),
      ],
    )

    const [classic, vanilla] = view.courses[0]!.modes
    expect(classic?.mode).toBe('classic')
    expect(classic?.rankedStatus.final).toEqual({
      approverName: 'Final',
      displayValue: 'Ranked',
    })
    expect(classic?.reasoning.final).toEqual({
      approverName: 'Final',
      displayValue: 'Settled',
    })

    expect(vanilla?.mode).toBe('vanilla')
    expect(vanilla?.rankedStatus.entries).toEqual([
      { approverName: 'Alice', displayValue: 'Unranked' },
    ])
    expect(vanilla?.rankedStatus.final).toBeNull()
  })

  it('renders a Final reasoning value of null when the lead finalized without written notes', () => {
    // Null and whitespace-only notes are the same: the Final badge stays
    // present (one per field), its value a placeholder the UI renders — the
    // omission rule omits proposals, it does not delete the reference row.
    for (const notes of [null, '', '   ']) {
      const view = buildApproverVotesView(
        [course('course-1', 'Aerodrome', [finalFilter('course-1', 'classic', { notes })])],
        [],
      )

      expect(view.courses[0]!.modes[0]!.reasoning.final).toEqual({
        approverName: 'Final',
        displayValue: null,
      })
    }
  })

  it('yields a well-defined empty shape for a decided submission with zero Votes', () => {
    // Approved lead-only finalization: every Course maps, modes come from
    // the Finalized filters, proposal groups are empty, Final badges present.
    const approved = buildApproverVotesView(
      [
        course('course-1', 'Aerodrome', [
          finalFilter('course-1', 'classic'),
          finalFilter('course-1', 'vanilla'),
        ]),
      ],
      [],
    )

    expect(approved.courses[0]).toMatchObject({
      courseId: 'course-1',
      courseName: 'Aerodrome',
      courseImageUrl: 'https://img.example/course-1.jpg',
    })
    expect(approved.courses[0]!.modes).toEqual([
      {
        mode: 'classic',
        rankedStatus: {
          entries: [],
          final: { approverName: 'Final', displayValue: 'Ranked' },
        },
        nubTier: {
          entries: [],
          final: { approverName: 'Final', displayValue: 1 },
        },
        proTier: {
          entries: [],
          final: { approverName: 'Final', displayValue: 2 },
        },
        reasoning: {
          entries: [],
          final: { approverName: 'Final', displayValue: null },
        },
      },
      {
        mode: 'vanilla',
        rankedStatus: {
          entries: [],
          final: { approverName: 'Final', displayValue: 'Ranked' },
        },
        nubTier: {
          entries: [],
          final: { approverName: 'Final', displayValue: 1 },
        },
        proTier: {
          entries: [],
          final: { approverName: 'Final', displayValue: 2 },
        },
        reasoning: {
          entries: [],
          final: { approverName: 'Final', displayValue: null },
        },
      },
    ])

    // Rejected lead-only finalization: no Finalized filters and no Votes, so
    // every Course maps to an empty modes list — still a defined shape.
    const rejected = buildApproverVotesView(
      [course('course-1', 'Aerodrome')],
      [],
    )
    expect(rejected.courses[0]!.modes).toEqual([])
  })

  it('lists modes in the vote form order (classic, vanilla) and only addressed ones', () => {
    const vanillaOnly = buildApproverVotesView(
      [course('course-1', 'Aerodrome')],
      [
        vote('Alice', [
          filterRow('course-1', 'vanilla'),
        ]),
      ],
    )
    expect(vanillaOnly.courses[0]!.modes.map((mode) => mode.mode)).toEqual([
      'vanilla',
    ])

    const both = buildApproverVotesView(
      [course('course-1', 'Aerodrome', [finalFilter('course-1', 'vanilla')])],
      [
        vote('Alice', [
          filterRow('course-1', 'classic'),
        ]),
      ],
    )
    expect(both.courses[0]!.modes.map((mode) => mode.mode)).toEqual([
      'classic',
      'vanilla',
    ])
  })

  it('keeps Course identity, payload Course order, and per-Course attribution', () => {
    const view = buildApproverVotesView(
      [
        // Payload order deliberately differs from name order.
        course('course-2', 'Catacombs'),
        course('course-1', 'Aerodrome'),
      ],
      [
        vote('Alice', [
          filterRow('course-1', 'classic'),
        ]),
        vote('Bob', [
          filterRow('course-2', 'vanilla', { isRanked: false }),
        ]),
      ],
    )

    expect(view.courses.map((item) => item.courseId)).toEqual([
      'course-2',
      'course-1',
    ])
    expect(view.courses[0]).toEqual({
      courseId: 'course-2',
      courseName: 'Catacombs',
      courseImageUrl: 'https://img.example/course-2.jpg',
      modes: [
        {
          mode: 'vanilla',
          rankedStatus: {
            entries: [
              { approverName: 'Bob', displayValue: 'Unranked' },
            ],
            final: null,
          },
          nubTier: {
            entries: [{ approverName: 'Bob', displayValue: 1 }],
            final: null,
          },
          proTier: {
            entries: [{ approverName: 'Bob', displayValue: 1 }],
            final: null,
          },
          reasoning: {
            entries: [],
            final: null,
          },
        },
      ],
    })
    expect(view.courses[1]!.modes[0]!.nubTier.entries).toEqual([
      { approverName: 'Alice', displayValue: 1 },
    ])
  })
})