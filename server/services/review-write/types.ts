import type { RejectionAttachment } from '~/shared/types/attachment'
import type { VoteFilterInput } from '~/shared/schemas/review'
import type { ApprovalDecision, SubmissionStatus } from '~/shared/types/submission'

/** The fields of the submission row the spine's status guard reads. */
export interface SubmissionRecord {
  id: string
  status: SubmissionStatus
}

export interface VoteWrite {
  submissionId: string
  approverUserId: string
  approvalDecision: ApprovalDecision
  rejectionReason: string | null
  rejectionExplanation: string | null
}

export interface VoteRecord extends VoteWrite {
  id: string
  createdAt: Date
  updatedAt: Date
}

/** Narrow write contract the review-write spine depends on. A real adapter
 *  binds it to a Drizzle transaction client (`drizzle-store.ts`); the tests
 *  bind an in-memory fake with commit/discard semantics mirroring the
 *  transaction contract. */
export interface ReviewWriteStore {
  /** Fresh read of the submission row, inside the current transaction. */
  getSubmission(submissionId: string): Promise<SubmissionRecord | null>
  /** One upsert on the unique (submission, approver) constraint: a
   *  same-approver re-save updates the existing row instead of violating. */
  upsertVote(input: VoteWrite): Promise<VoteRecord>
  /** Replaces the vote's proposed Course filters wholesale. */
  replaceVoteFilters(voteId: string, filters: VoteFilterInput[]): Promise<void>
  /** The vote's currently stored attachment rows, normalized to the shared
   *  shape (called before `replaceVoteAttachments` wipes them). */
  listVoteAttachments(voteId: string): Promise<RejectionAttachment[]>
  /** Replaces the vote's stored attachment set wholesale. */
  replaceVoteAttachments(
    voteId: string,
    attachments: RejectionAttachment[],
  ): Promise<void>
}

/** Runs a write against a store whose changes commit on resolve and discard
 *  on throw — mirrors the DB transaction contract. */
export type ReviewWriteTransaction = <T>(
  fn: (store: ReviewWriteStore) => Promise<T>,
) => Promise<T>

export interface ReviewWriteDeps {
  runTransaction: ReviewWriteTransaction
  /** Best-effort storage deletion after the write commits; a storage hiccup
   *  must never fail the already-committed save. */
  deleteStorageObjects: (urls: string[]) => Promise<void>
  /** Storage facts the rejection-attachment rules need, resolved per call. */
  attachmentScope: () => { publicBaseUrl: string; allowedPrefix: string }
}