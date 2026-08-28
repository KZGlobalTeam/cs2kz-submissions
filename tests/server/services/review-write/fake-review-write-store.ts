import type { RejectionAttachment } from '~/shared/types/attachment'
import type { VoteFilterInput } from '~/shared/schemas/review'
import type {
  ReviewWriteDeps,
  ReviewWriteStore,
  SubmissionRecord,
  VoteRecord,
  VoteWrite,
} from '~/server/services/review-write/types'

export const FAKE_PUBLIC_BASE_URL = 'https://storage.example/public/'
export const FAKE_ALLOWED_PREFIX = 'rejection-attachments/'

/** Builds an attachment URL that passes the prefix rule, keyed by filename. */
export function attachmentUrl(key: string): string {
  return `${FAKE_PUBLIC_BASE_URL}${FAKE_ALLOWED_PREFIX}${key}`
}

/** In-memory picture of the tables the review write touches. The runner
 *  clones it per transaction; a successful write is committed back, a throw
 *  leaves the committed state untouched. */
export interface FakeDb {
  submissions: Map<string, SubmissionRecord>
  votes: Map<string, VoteRecord>
  /** `${submissionId}|${approverUserId}` → vote id (the unique constraint). */
  voteKeys: Map<string, string>
  voteFilters: Map<string, VoteFilterInput[]>
  voteAttachments: Map<string, RejectionAttachment[]>
}

export function createFakeDb(): FakeDb {
  return {
    submissions: new Map(),
    votes: new Map(),
    voteKeys: new Map(),
    voteFilters: new Map(),
    voteAttachments: new Map(),
  }
}

export function seedSubmission(db: FakeDb, submission: SubmissionRecord): void {
  db.submissions.set(submission.id, submission)
}

/** Per-test store behavior overrides. `getSubmission` lets a test model a
 *  concurrent writer flipping the status between the write starting and the
 *  spine's in-transaction re-read. */
export interface FakeStoreOptions {
  getSubmission?: (submissionId: string) => Promise<SubmissionRecord | null>
  /** When set, replaces the wholesale attachment write (e.g. to throw). */
  replaceVoteAttachments?: (
    voteId: string,
    attachments: RejectionAttachment[],
  ) => Promise<void>
}

export function createFakeStore(
  db: FakeDb,
  options: FakeStoreOptions = {},
): ReviewWriteStore {
  return {
    async getSubmission(submissionId) {
      if (options.getSubmission) {
        return options.getSubmission(submissionId)
      }
      return db.submissions.get(submissionId) ?? null
    },

    async upsertVote(input: VoteWrite) {
      const key = `${input.submissionId}|${input.approverUserId}`
      const existingId = db.voteKeys.get(key)
      const existing = existingId ? db.votes.get(existingId) : undefined
      if (existing) {
        const updated: VoteRecord = {
          ...existing,
          approvalDecision: input.approvalDecision,
          rejectionReason: input.rejectionReason,
          rejectionExplanation: input.rejectionExplanation,
          updatedAt: new Date(),
        }
        db.votes.set(existing.id, updated)
        return updated
      }

      const vote: VoteRecord = {
        id: `vote-${db.votes.size + 1}`,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      db.votes.set(vote.id, vote)
      db.voteKeys.set(key, vote.id)
      return vote
    },

    async replaceVoteFilters(voteId, filters) {
      db.voteFilters.set(voteId, [...filters])
    },

    async listVoteAttachments(voteId) {
      return [...(db.voteAttachments.get(voteId) ?? [])]
    },

    async replaceVoteAttachments(voteId, attachments) {
      if (options.replaceVoteAttachments) {
        await options.replaceVoteAttachments(voteId, attachments)
        return
      }
      db.voteAttachments.set(voteId, [...attachments])
    },
  }
}

function commitMap<K, V>(src: Map<K, V>, dst: Map<K, V>): void {
  dst.clear()
  for (const [key, value] of src) dst.set(key, value)
}

function commitScratch(scratch: FakeDb, committed: FakeDb): void {
  // Replace each map wholesale so keys deleted inside the transaction are
  // deleted on the committed side too (decision writes delete rows).
  commitMap(scratch.submissions, committed.submissions)
  commitMap(scratch.votes, committed.votes)
  commitMap(scratch.voteKeys, committed.voteKeys)
  commitMap(scratch.voteFilters, committed.voteFilters)
  commitMap(scratch.voteAttachments, committed.voteAttachments)
}

/** Binds the module under test to the fake: writes apply to a scratch copy
 *  of the db, success commits it back, a throw discards it. Storage
 *  deletions are recorded in the returned `deleted` array. */
export function createFakeDeps(
  db: FakeDb,
  options: FakeStoreOptions = {},
): { deps: ReviewWriteDeps; deleted: string[] } {
  const deleted: string[] = []

  const deps: ReviewWriteDeps = {
    runTransaction: async (fn) => {
      const scratch = structuredClone(db)
      const store = createFakeStore(scratch, options)
      const result = await fn(store)
      commitScratch(scratch, db)
      return result
    },
    deleteStorageObjects: async (urls) => {
      deleted.push(...urls)
    },
    attachmentScope: () => ({
      publicBaseUrl: FAKE_PUBLIC_BASE_URL,
      allowedPrefix: FAKE_ALLOWED_PREFIX,
    }),
  }

  return { deps, deleted }
}