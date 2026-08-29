import type { ApprovalDecision, SubmissionStatus } from '~/shared/types/submission'

/** Wire-facing pagination window as data — never SQL fragments. The endpoint
 *  composes it from `page`/`pageSize`; the module (issue 01) adds the
 *  per-read ordering and forwards it to the store. */
export interface PageBounds {
  limit: number
  offset: number
}

/** Which clock column a page is ordered by — always descending, with nulls
 *  last (both the Drizzle adapter and the fake apply the same rule, so the
 *  SQL and the test oracle can never disagree). The module decides per read
 *  (issue 01): the queue orders by `approvedAt` when the status filter is
 *  `approved` and by `createdAt` otherwise; mine always by `createdAt`.
 *  Passed as data so the Drizzle adapter and the fake apply the exact same
 *  sort, with the same window semantics (ORDER BY before LIMIT/OFFSET in one
 *  statement). */
export type PageOrder = 'createdAt' | 'approvedAt'

/** The page window plus the ordering policy the module picked for this read. */
export type PageBoundsWithOrder = PageBounds & { orderBy: PageOrder }

/** Predicate for a submissions read: exactly one of two branches — the owner
 *  (`mine`) read, or the review-queue read. The queue read is one of three
 *  mutually exclusive forms: with the Unvoted filter (whose `userId` is also
 *  the viewer), with an explicit viewer identity only, or bare (no viewer —
 *  the queue read without the Unvoted filter, `myVote` null). `unvoted`
 *  cannot be stated without its user (the old list/count guard asymmetry
 *  becomes a type error). A malformed value carrying both `unvoted` and
 *  `viewerId` still resolves deterministically: `resolveFilters` prefers the
 *  Unvoted branch, so the exclusion and the myVote identity can never name
 *  different users. When a caller supplies the owner key, `resolveFilters`
 *  deterministically prefers the owner branch. */
export type ReviewQueueFilters = { status?: SubmissionStatus } & (
  | { ownerId: string }
  | { unvoted: { userId: string } }
  | { viewerId?: string }
)

/** The filters resolved to their flat form. Both the Drizzle adapter and the
 *  fake store build their predicate from this one object, so the rule —
 *  owner match, and unvoted meaning "no vote row from that viewer" — is
 *  enforced identically against the real database and in tests. Consumers
 *  test the fields for truthiness, never for key presence (resolution leaves
 *  absent filters as `undefined`). `viewerId` is the queue read's identity
 *  for the module's myVote aggregation — never a predicate; the adapter and
 *  the fake ignore it when they build their conditions, so the Unvoted
 *  exclusion and the viewer's own votes are decoupled. On the unvoted
 *  branch it coalesces to the unvoted filter's user, so every queue read
 *  with a viewer reports `myVote` exactly as today. */
export interface ResolvedFilters {
  status?: SubmissionStatus
  ownerId?: string
  unvotedUserId?: string
  viewerId?: string
}

/** Resolves the discriminated filters value to its flat form. The Unvoted
 *  branch's user is the viewer, so it lands on both `unvotedUserId` (the
 *  predicate) and `viewerId` (the identity) — one value, never two names.
 *  A malformed value carrying both queue keys (or an empty `unvoted`) can
 *  still reach runtime: presence decides, and the Unvoted branch wins, so
 *  the exclusion and the myVote identity can never name different users. */
export function resolveFilters(filters: ReviewQueueFilters): ResolvedFilters {
  if ('ownerId' in filters) {
    return { status: filters.status, ownerId: filters.ownerId }
  }
  const unvoted = 'unvoted' in filters ? filters.unvoted : undefined
  const viewerId = 'viewerId' in filters ? filters.viewerId : undefined
  if (unvoted) {
    return {
      status: filters.status,
      unvotedUserId: unvoted.userId,
      viewerId: unvoted.userId,
    }
  }
  return { status: filters.status, viewerId }
}

/** One page row of the submissions table as the store returns it — raw DB
 *  types; the module's assembly serializes the timestamps to ISO after
 *  aggregation. */
export interface SubmissionsPageRow {
  id: string
  mapName: string
  workshopId: number
  workshopUrl: string
  status: SubmissionStatus
  createdAt: Date
  approvedAt: Date | null
}

/** One named mapper row of a submission (the stored display-name snapshot as
 *  of submission time). */
export interface SubmissionMapperRow {
  submissionId: string
  displayNameSnapshot: string
}

/** Vote counts grouped by approval decision — one row per
 *  (submission, decision) with a count; absent decisions produce no row and
 *  the module defaults them to zero. */
export interface VoteCountByDecisionRow {
  submissionId: string
  approvalDecision: ApprovalDecision
  voteCount: number
}

/** One of the viewer's own votes on a submission. */
export interface ViewerVoteRow {
  submissionId: string
  approvalDecision: ApprovalDecision
}

/** Course count of one submission. */
export interface CourseCountRow {
  submissionId: string
  courseCount: number
}

/** Statement-granular read seam the review-queue module stands on. The real
 *  adapter (`drizzle-store.ts`) maps these onto Drizzle; the tests bind an
 *  in-memory fake (`tests/server/services/review-queue/fake-review-read-store.ts`)
 *  that filters its rows from the same `ResolvedFilters` the adapter
 *  consumes. Aggregation lives in the module, never here. */
export interface ReviewReadStore {
  /** One page of submissions matching the resolved filters, ordered per the
   *  bounds' `orderBy` (always descending) and clipped to the window. */
  listSubmissionsPage(
    filters: ResolvedFilters,
    bounds: PageBoundsWithOrder,
  ): Promise<SubmissionsPageRow[]>

  /** The count of submissions matching the same resolved filters the list
   *  used — the module always runs list and count against one value. */
  countSubmissions(filters: ResolvedFilters): Promise<number>

  /** Named mapper rows for the given submissions, in store order. */
  listMappers(submissionIds: string[]): Promise<SubmissionMapperRow[]>

  /** Vote counts grouped by (submission, approval decision). */
  countVotesByDecision(submissionIds: string[]): Promise<VoteCountByDecisionRow[]>

  /** The given viewer's own votes on the submissions. */
  listMyVotes(submissionIds: string[], userId: string): Promise<ViewerVoteRow[]>

  /** Course counts keyed by submission. */
  countCourses(submissionIds: string[]): Promise<CourseCountRow[]>
}