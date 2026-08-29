import type { ApprovalDecision } from '~/shared/types/submission'
import type {
  CourseCountRow,
  PageOrder,
  ResolvedFilters,
  ReviewReadStore,
  SubmissionMapperRow,
  SubmissionsPageRow,
  ViewerVoteRow,
  VoteCountByDecisionRow,
} from '~/server/services/review-queue/types'

/** A submission as the fake stores it: the page row plus the owner column the
 *  owner filter runs on (the projected page row the store returns does not
 *  carry it). */
export interface FakeSubmissionRow extends SubmissionsPageRow {
  createdByUserId: string
}

/** One vote row, mirroring the unique (submission, approver) constraint. */
export interface FakeVoteRow {
  id: string
  submissionId: string
  approverUserId: string
  approvalDecision: ApprovalDecision
}

/** One named mapper row of a submission. */
export type FakeMapperRow = SubmissionMapperRow

/** One course row of a submission. */
export interface FakeCourseRow {
  id: string
  submissionId: string
}

/** In-memory picture of the tables the reads touch. */
export interface FakeReadDb {
  submissions: FakeSubmissionRow[]
  mappers: FakeMapperRow[]
  votes: FakeVoteRow[]
  courses: FakeCourseRow[]
}

export function createFakeReadDb(): FakeReadDb {
  return {
    submissions: [],
    mappers: [],
    votes: [],
    courses: [],
  }
}

export function seedSubmission(db: FakeReadDb, row: FakeSubmissionRow): void {
  db.submissions.push(row)
}

export function seedMapper(db: FakeReadDb, row: FakeMapperRow): void {
  db.mappers.push(row)
}

export function seedVote(db: FakeReadDb, row: FakeVoteRow): void {
  db.votes.push(row)
}

export function seedCourse(db: FakeReadDb, row: FakeCourseRow): void {
  db.courses.push(row)
}

function clockValue(row: FakeSubmissionRow, orderBy: PageOrder): number {
  return orderBy === 'approvedAt'
    ? (row.approvedAt?.getTime() ?? 0)
    : row.createdAt.getTime()
}

function toPageRow(row: FakeSubmissionRow): SubmissionsPageRow {
  return {
    id: row.id,
    mapName: row.mapName,
    workshopId: row.workshopId,
    workshopUrl: row.workshopUrl,
    status: row.status,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
  }
}

/** Binds the `ReviewReadStore` contract to an in-memory table set. Rows are
 *  filtered from the same `ResolvedFilters` the Drizzle adapter consumes
 *  (owner match, unvoted = no vote row from that viewer), sorted and clipped
 *  by the same data-driven bounds, so the rule is enforced identically
 *  against the fake and the real database. */
export function createFakeReadStore(db: FakeReadDb): ReviewReadStore {
  const matchingRows = (filters: ResolvedFilters): FakeSubmissionRow[] =>
    db.submissions.filter(
      (row) =>
        (filters.status === undefined || row.status === filters.status)
        && (filters.ownerId === undefined || row.createdByUserId === filters.ownerId)
        && (filters.unvotedUserId === undefined
          || !db.votes.some(
            (vote) =>
              vote.submissionId === row.id
              && vote.approverUserId === filters.unvotedUserId,
          )),
    )

  return {
    async listSubmissionsPage(filters, bounds) {
      const page = matchingRows(filters)
        .slice()
        .sort((a, b) => clockValue(b, bounds.orderBy) - clockValue(a, bounds.orderBy))
        .slice(bounds.offset, bounds.offset + bounds.limit)
      return page.map(toPageRow)
    },

    async countSubmissions(filters) {
      return matchingRows(filters).length
    },

    async listMappers(submissionIds) {
      return db.mappers.filter((row) =>
        submissionIds.includes(row.submissionId),
      )
    },

    async countVotesByDecision(submissionIds) {
      const bySubmission = new Map<string, { yes: number; no: number }>()
      for (const vote of db.votes) {
        if (!submissionIds.includes(vote.submissionId)) {
          continue
        }
        const counts = bySubmission.get(vote.submissionId) ?? { yes: 0, no: 0 }
        counts[vote.approvalDecision] += 1
        bySubmission.set(vote.submissionId, counts)
      }
      const rows: VoteCountByDecisionRow[] = []
      for (const [submissionId, counts] of bySubmission) {
        if (counts.yes > 0) {
          rows.push({ submissionId, approvalDecision: 'yes', voteCount: counts.yes })
        }
        if (counts.no > 0) {
          rows.push({ submissionId, approvalDecision: 'no', voteCount: counts.no })
        }
      }
      return rows
    },

    async listMyVotes(submissionIds, userId) {
      return db.votes
        .filter((vote) =>
          submissionIds.includes(vote.submissionId)
          && vote.approverUserId === userId,
        )
        .map(({ submissionId, approvalDecision }): ViewerVoteRow => ({
          submissionId,
          approvalDecision,
        }))
    },

    async countCourses(submissionIds) {
      const counts = new Map<string, number>()
      for (const courseRow of db.courses) {
        if (!submissionIds.includes(courseRow.submissionId)) {
          continue
        }
        counts.set(
          courseRow.submissionId,
          (counts.get(courseRow.submissionId) ?? 0) + 1,
        )
      }
      const rows: CourseCountRow[] = []
      for (const [submissionId, courseCount] of counts) {
        rows.push({ submissionId, courseCount })
      }
      return rows
    },
  }
}