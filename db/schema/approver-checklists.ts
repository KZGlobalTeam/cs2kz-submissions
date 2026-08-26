import {
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import type { ApproverChecklist } from '~/shared/schemas/approver-checklist'

import { submissions } from './submissions'
import { timestamps, users } from './users'

/**
 * One private scratchpad row per (submission, approver) — the Approver
 * checklist and Approver note (ADR 0003). Rows cascade away with their
 * submission, and the unique (submission, approver) pair is what lets the
 * checklist endpoints upsert safely with `onConflictDoUpdate`.
 *
 * Deliberately separate from `submission_votes`: the votes payload is shared
 * between every approver and folded into the shared submission-detail
 * response, while this table is read and written only by the owning plain
 * approver through the dedicated approver-checklist endpoints.
 */
export const submissionApproverChecklists = pgTable(
  'submission_approver_checklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    approverUserId: uuid('approver_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Rule-group key → per-rule verified ticks. Loose keys: a rule-text
     *  change never invalidates a stored save; unknown keys are merely never
     *  rendered. */
    checklist: jsonb('checklist').$type<ApproverChecklist>().notNull(),
    note: text('note'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('submission_approver_checklists_unique_idx').on(
      table.submissionId,
      table.approverUserId,
    ),
    index('submission_approver_checklists_submission_idx').on(
      table.submissionId,
    ),
  ],
)