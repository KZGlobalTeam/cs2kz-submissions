import type { ApprovalDecision } from '~/shared/types/submission'

import type {
  PageBounds,
  ReviewQueueFilters,
  ReviewReadStore,
  SubmissionsPageRow,
  ViewerVoteRow,
} from './types'
import { resolveFilters } from './types'

/** The aggregates one review-queue row is projected from, all keyed by
 *  submission id: the named mapper display-name snapshots in store order,
 *  the yes/no tallies (a submission with no votes of a decision defaults to
 *  zero), the viewer's own vote (at most one row per submission thanks to
 *  the unique (submission, approver) constraint; the last store row wins),
 *  and the course count. Built once per queue page from the six
 *  statement-granular store reads, then merged row by row. */
interface QueueRowAggregates {
  mappersBySubmission: Map<string, string[]>
  votesBySubmission: Map<string, { yes: number; no: number }>
  myVoteBySubmission: Map<string, ApprovalDecision>
  courseCountBySubmission: Map<string, number>
}

/** The projected columns both assemblies share, serialized for the wire —
 *  the timestamps as ISO strings (exactly how they cross HTTP/JSON). The
 *  assemblies spread this and add their page-specific fields. */
function serializeSubmissionRow(row: SubmissionsPageRow) {
  return {
    id: row.id,
    mapName: row.mapName,
    workshopId: row.workshopId,
    workshopUrl: row.workshopUrl,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
  }
}

/** The queue assembly: the serialized submission row plus the named mappers,
 *  the yes/no tallies, the viewer's own vote (null when the queue read
 *  carries no viewer), and the course count. `ReviewSubmissionRow` is
 *  derived from this body, so the row shape and the code that produces it
 *  cannot drift. */
function buildQueueRow(row: SubmissionsPageRow, aggregates: QueueRowAggregates) {
  return {
    ...serializeSubmissionRow(row),
    courseCount: aggregates.courseCountBySubmission.get(row.id) ?? 0,
    mappers: aggregates.mappersBySubmission.get(row.id) ?? [],
    yesVotes: aggregates.votesBySubmission.get(row.id)?.yes ?? 0,
    noVotes: aggregates.votesBySubmission.get(row.id)?.no ?? 0,
    myVote: aggregates.myVoteBySubmission.get(row.id) ?? null,
  }
}

/** One row of the review-queue list, built by the queue assembly from the
 *  statement-granular store (derived, never hand-synced). */
export type ReviewSubmissionRow = ReturnType<typeof buildQueueRow>

/** The "mine" assembly: the serialized submission row plus the computed
 *  vote count (total yes+no from `countVotesByDecision`) so the owner can
 *  hide the Edit/Delete actions as soon as review has started. */
function buildMineRow(row: SubmissionsPageRow, voteCount: number) {
  return {
    ...serializeSubmissionRow(row),
    voteCount,
  }
}

/** One row of the "mine" submissions list, built by the mine assembly
 *  (derived, never hand-synced). */
export type OwnSubmissionRow = ReturnType<typeof buildMineRow>

/** The review-queue read surface. Both methods run their list and their
 *  count in parallel internally against the *same* filters value, so a
 *  caller cannot ask for list rows under different predicates than the
 *  count — the old list/count guard asymmetry is structurally impossible. */
export interface ReviewQueueRead {
  /** The submissions the given owner created, newest first. */
  getMinePage(
    filters: ReviewQueueFilters,
    bounds: PageBounds,
  ): Promise<{ items: OwnSubmissionRow[]; total: number }>

  /** The review queue: every submission matching the status and (optional)
   *  Unvoted filters, ordered by `approvedAt` desc when the status filter is
   *  `approved` and by `createdAt` desc otherwise. `filters` carries the
   *  viewer's identity (`viewerId`, or the Unvoted filter's user id) so the
   *  rows can report the viewer's own vote. */
  getQueuePage(
    filters: ReviewQueueFilters,
    bounds: PageBounds,
  ): Promise<{ items: ReviewSubmissionRow[]; total: number }>
}

/** Binds the review-queue reads to a concrete `ReviewReadStore`. Production
 *  wiring attaches the Drizzle adapter (`drizzle-store.ts`); the tests attach
 *  the in-memory fake. All aggregation lives here — the store stays
 *  statement-granular. */
export function createReviewQueueRead(store: ReviewReadStore): ReviewQueueRead {
  return {
    async getMinePage(filters, bounds) {
      const resolved = resolveFilters(filters)
      const [rows, total] = await Promise.all([
        store.listSubmissionsPage(resolved, { ...bounds, orderBy: 'createdAt' }),
        store.countSubmissions(resolved),
      ])

      if (rows.length === 0) {
        return { items: [], total }
      }

      const ids = rows.map((row) => row.id)
      const voteTallies = await store.countVotesByDecision(ids)

      // voteCount is the total of yes and no, one aggregate serving both
      // assemblies (the votes table only holds yes/no decisions).
      const voteCountBySubmission = new Map<string, number>()
      for (const tally of voteTallies) {
        voteCountBySubmission.set(
          tally.submissionId,
          (voteCountBySubmission.get(tally.submissionId) ?? 0) + tally.voteCount,
        )
      }

      return {
        items: rows.map((row) =>
          buildMineRow(row, voteCountBySubmission.get(row.id) ?? 0),
        ),
        total,
      }
    },

    async getQueuePage(filters, bounds) {
      const resolved = resolveFilters(filters)
      const orderBy = resolved.status === 'approved' ? 'approvedAt' : 'createdAt'
      const [rows, total] = await Promise.all([
        store.listSubmissionsPage(resolved, { ...bounds, orderBy }),
        store.countSubmissions(resolved),
      ])

      if (rows.length === 0) {
        return { items: [], total }
      }

      const ids = rows.map((row) => row.id)
      // The viewer's identity is resolved into `viewerId` by the filters
      // rule (the Unvoted filter's user is the viewer), decoupled from the
      // Unvoted predicate — so myVote works on every queue read, filtered or
      // not, exactly as today.
      const [mappers, voteTallies, myVotes, courseCounts] = await Promise.all([
        store.listMappers(ids),
        store.countVotesByDecision(ids),
        resolved.viewerId
          ? store.listMyVotes(ids, resolved.viewerId)
          : Promise.resolve<ViewerVoteRow[]>([]),
        store.countCourses(ids),
      ])

      const aggregates: QueueRowAggregates = {
        mappersBySubmission: new Map<string, string[]>(),
        votesBySubmission: new Map<string, { yes: number; no: number }>(),
        myVoteBySubmission: new Map<string, ApprovalDecision>(),
        courseCountBySubmission: new Map<string, number>(),
      }

      for (const mapper of mappers) {
        const names = aggregates.mappersBySubmission.get(mapper.submissionId)
        if (names) {
          names.push(mapper.displayNameSnapshot)
        }
        else {
          aggregates.mappersBySubmission.set(mapper.submissionId, [mapper.displayNameSnapshot])
        }
      }

      for (const tally of voteTallies) {
        const counts = aggregates.votesBySubmission.get(tally.submissionId)
          ?? { yes: 0, no: 0 }
        counts[tally.approvalDecision] = tally.voteCount
        aggregates.votesBySubmission.set(tally.submissionId, counts)
      }

      for (const vote of myVotes) {
        aggregates.myVoteBySubmission.set(vote.submissionId, vote.approvalDecision)
      }

      for (const course of courseCounts) {
        aggregates.courseCountBySubmission.set(course.submissionId, course.courseCount)
      }

      return {
        items: rows.map((row) => buildQueueRow(row, aggregates)),
        total,
      }
    },
  }
}