import { tierToNumber } from '~/shared/schemas/cs2kz'
import type { Mode } from '~/shared/schemas/cs2kz'
import { modesForGame } from '~/shared/schemas/course-mode'
import type { Game } from '~/shared/schemas/game'
import type {
  SubmissionDetailCourse,
  SubmissionDetailFinalFilter,
  SubmissionDetailVote,
  SubmissionDetailVoteFilter,
} from '~/shared/types/submission-detail'

/**
 * The pure view-model behind the approver-votes section of the decided
 * submission details page (issue 02): maps the details payload — the
 * courses, the Votes, and the per-Course Finalized filters — into the
 * per-Course, per-Course-mode, per-field badge structure the page renders
 * verbatim. The submission's game is passed in (the page supplies the
 * detail payload's own row game — the row is truth), and the per-game mode
 * vocabulary decides the Course-mode blocks: a decided CS:GO submission
 * shows KZT, SKZ, then VNL per course; CS2 shows CKZ and VNL exactly as
 * today.
 *
 * Stateless and payload-shaped: it takes the exact `SubmissionDetailCourse[]`
 * / `SubmissionDetailVote[]` types the details API returns. The Finalized
 * filters travel inside each Course's `finalFilters`, exactly where the
 * payload ships them — the ticket's "(courses, votes, finalFilters)" inputs
 * are one payload, so there is no way to pass a courses/finals mismatch,
 * and no drift copies of the wire types exist. The Course identity (name,
 * image) rides along so the section can render the Course block itself.
 *
 * Display rules:
 * - Tier values render as the numeric scale 1–10 (`tierToNumber`).
 * - Ranked state renders as `'Ranked'` / `'Unranked'`.
 * - Reasoning renders as its text; empty reasoning — null, empty, or
 *   whitespace-only — is omitted from a Vote's proposal badges. The
 *   Reasoning row never carries a Final entry: the lead has no way to
 *   finalize reasoning, so no settlement is derived (issue 01).
 * - A Vote that recorded no proposed Course filter on a Course contributes
 *   no badges there — missing cells render honestly as absent.
 * - Every field except Reasoning carries one `Final` reference badge
 *   derived from the Course's Finalized filter for that Course mode. Only
 *   approvals carry Finalized filters (a rejection finalizes none — see the
 *   review-write spine), so a Course mode settled by votes alone renders
 *   proposal badges with no Final badge.
 * - A Course mode appears only when a Vote proposed a filter for it or the
 *   Course has a Finalized filter for it — the spec's "no placeholder rows
 *   for unvoted filters" rule; Course modes order per the submission's
 *   game (CKZ then VNL for CS2, KZT then SKZ then VNL for CS:GO), matching
 *   the vote form and the lead decision panel.
 * - A decided submission with zero Votes yields the same well-defined shape
 *   with empty proposal groups — the empty structure the Status of Approval
 *   section renders as a terminal page, never a pending-review message.
 */

/** The ranked state as rendered: the vote form's Ranked/Unranked labels,
 *  never the stored boolean. */
export type RankedStatusDisplay = 'Ranked' | 'Unranked'

/** The tier as rendered: the ten-level Filter tier scale surfaces as a
 *  numeric 1–10 label. */
export type TierDisplay = number

/** Reasoning as rendered: only the written text an approver actually
 *  proposed. The Reasoning row never carries a Final entry (issue 01), so a
 *  missing value can never surface here — the written-only rule below. */
export type ReasoningDisplay = string

/** One rendered badge: the approver's name and the field's display value. */
export interface ApproverBadge<T> {
  approverName: string
  displayValue: T
}

/** The per-field "Final" reference badge: the name is the constant `Final`
 *  and the display value derives from the Course's Finalized filter for the
 *  Course mode. */
export interface FinalBadge<T> {
  approverName: 'Final'
  displayValue: T
}

/** One field's badge group: one entry per approver who proposed a value on
 *  this Course mode — a Vote with no filter row for the Course mode
 *  contributes nothing — plus the single Final reference badge when the
 *  Course carries a Finalized filter for the Course mode. */
export interface FieldBadges<T> {
  entries: ApproverBadge<T>[]
  final: FinalBadge<T> | null
}

/** The Reasoning row's badge group: one entry per approver who wrote
 *  reasoning on this Course mode. No Final reference badge exists here —
 *  the display model never derives a reasoning settlement (issue 01), so
 *  the row renders proposals only and never a `Final:` placeholder. */
export interface ReasoningBadges {
  entries: ApproverBadge<ReasoningDisplay>[]
}

/** The four fields of one Course-mode block, mirroring the vote form's
 *  CourseFilterVoteTable rows: Ranked Status, NUB tier, PRO tier, Reasoning. */
export interface ModeBadges {
  mode: Mode
  rankedStatus: FieldBadges<RankedStatusDisplay>
  nubTier: FieldBadges<TierDisplay>
  proTier: FieldBadges<TierDisplay>
  reasoning: ReasoningBadges
}

/** One Course block of the section: the Course identity the block renders
 *  around (following the vote form's layout) and its Course-mode blocks. */
export interface CourseBadges {
  courseId: string
  courseName: string
  courseImageUrl: string
  modes: ModeBadges[]
}

/** The derived section shape: one entry per payload Course, in payload
 *  order. Zero-vote decided submissions still map every Course — with empty
 *  proposal groups — so the empty state is a defined shape, never
 *  `undefined`. */
export interface ApproverVotesView {
  courses: CourseBadges[]
}

const FINAL_APPROVER_NAME = 'Final'

/** The omission rule for reasoning: only written reasoning renders — a
 *  null, empty, or whitespace-only Filter note is not reasoning. The written
 *  text is preserved untouched. */
function isWrittenReason(notes: string | null): notes is string {
  return notes !== null && notes.trim().length > 0
}

/** One proposal row: a Vote that proposed a filter for one Course mode. At
 *  most one row per Vote exists per Course mode (the schema's unique
 *  constraint), in payload Vote order. */
interface ProposedFilter {
  approverName: string
  filter: SubmissionDetailVoteFilter
}

/** The single walk over the payload that both mode presence and every
 *  field's badge groups derive from: the Votes that proposed a filter for
 *  one Course mode. */
function proposeFilter(
  courseId: string,
  mode: Mode,
  votes: SubmissionDetailVote[],
): ProposedFilter[] {
  return votes.flatMap((vote) => {
    const filter = vote.filters.find(
      (item) => item.courseId === courseId && item.mode === mode,
    )
    return filter ? [{ approverName: vote.approverName, filter }] : []
  })
}

/** The per-field Final reference badge, or none when the Course has no
 *  Finalized filter for the Course mode (only approvals carry Finalized
 *  filters). `finalValue` runs only when a Finalized filter exists. */
function finalBadgeFor<T>(
  finalFilter: SubmissionDetailFinalFilter | undefined,
  finalValue: (filter: SubmissionDetailFinalFilter) => T,
): FinalBadge<T> | null {
  return finalFilter
    ? { approverName: FINAL_APPROVER_NAME, displayValue: finalValue(finalFilter) }
    : null
}

/** Builds one field's badge group from the proposed rows and the Course's
 *  Finalized filter (when one exists). `entryValue` projects each proposal's
 *  display value, `finalValue` the Final reference badge's. */
function buildFieldBadges<T>(
  proposed: ProposedFilter[],
  finalFilter: SubmissionDetailFinalFilter | undefined,
  entryValue: (filter: SubmissionDetailVoteFilter) => T,
  finalValue: (filter: SubmissionDetailFinalFilter) => T,
): FieldBadges<T> {
  return {
    entries: proposed.map(({ approverName, filter }) => ({
      approverName,
      displayValue: entryValue(filter),
    })),
    final: finalBadgeFor(finalFilter, finalValue),
  }
}

/** Builds the Reasoning row's badge group — proposals only, the written
 *  text each approver actually proposed (the written-only omission rule),
 *  with no Final entry and therefore no settlement and no placeholder. The
 *  Finalized filter plays no part: a Finalized filter carries no reason text
 *  at all after the finalized-reasoning purge (proposal-only Filter notes),
 *  so there is nothing a settlement could even display. */
function buildReasoningBadges(proposed: ProposedFilter[]): ReasoningBadges {
  const entries: ApproverBadge<ReasoningDisplay>[] = []
  for (const { approverName, filter } of proposed) {
    if (!isWrittenReason(filter.notes)) {
      continue
    }
    entries.push({ approverName, displayValue: filter.notes })
  }
  return { entries }
}

function buildModeBadges(
  mode: Mode,
  finalFilter: SubmissionDetailFinalFilter | undefined,
  proposed: ProposedFilter[],
): ModeBadges {
  return {
    mode,
    rankedStatus: buildFieldBadges(
      proposed,
      finalFilter,
      (filter) => (filter.isRanked ? 'Ranked' : 'Unranked'),
      (filter) => (filter.isRanked ? 'Ranked' : 'Unranked'),
    ),
    nubTier: buildFieldBadges(
      proposed,
      finalFilter,
      (filter) => tierToNumber(filter.nubTier),
      (filter) => tierToNumber(filter.nubTier),
    ),
    proTier: buildFieldBadges(
      proposed,
      finalFilter,
      (filter) => tierToNumber(filter.proTier),
      (filter) => tierToNumber(filter.proTier),
    ),
    reasoning: buildReasoningBadges(proposed),
  }
}

function buildCourseBadges(
  course: SubmissionDetailCourse,
  votes: SubmissionDetailVote[],
  modeOrder: readonly Mode[],
): CourseBadges {
  return {
    courseId: course.id,
    courseName: course.name,
    courseImageUrl: course.imageUrl,
    modes: modeOrder.flatMap((mode) => {
      const finalFilter = course.finalFilters.find(
        (filter) => filter.mode === mode,
      )
      // A silent Course mode renders nothing (spec: "no placeholder rows for
      // unvoted filters") — it appears only when a Vote proposed a filter
      // for it or the Course has a Finalized filter for it.
      const proposed = proposeFilter(course.id, mode, votes)
      if (proposed.length === 0 && !finalFilter) {
        return []
      }
      return [buildModeBadges(mode, finalFilter, proposed)]
    }),
  }
}

/** Derives the approver-votes section's badge structure from the details
 *  payload (issue 02). Pure and stateless: payload and the submission's
 *  game in, display model out — `game` picks the per-game mode vocabulary
 *  (`modesForGame`), so a CS:GO submission's blocks always render its own
 *  KZT/SKZ/VNL modes and out-of-game rows contribute nothing. */
export function buildApproverVotesView(
  courses: SubmissionDetailCourse[],
  votes: SubmissionDetailVote[],
  game: Game,
): ApproverVotesView {
  const modeOrder = modesForGame(game)
  return { courses: courses.map((course) => buildCourseBadges(course, votes, modeOrder)) }
}