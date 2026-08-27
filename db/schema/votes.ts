import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  courseFilterStateValues,
  courseFilterTierValues,
  modeValues,
} from '../../shared/schemas/cs2kz'
import { submissionCourses, submissions } from './submissions'
import { timestamps, users } from './users'

export const approvalDecisionEnum = pgEnum('approval_decision', ['yes', 'no'])
/** Derives from the shared value arrays so the DB enum cannot drift from the
 *  schemas the write endpoints validate against. */
export const modeEnum = pgEnum('course_mode', modeValues)
export const courseFilterTierEnum = pgEnum(
  'course_filter_tier',
  courseFilterTierValues,
)
export const courseFilterStateEnum = pgEnum(
  'course_filter_state',
  courseFilterStateValues,
)

export const submissionVotes = pgTable(
  'submission_votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    approverUserId: uuid('approver_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    approvalDecision: approvalDecisionEnum('approval_decision').notNull(),
    rejectionReason: text('rejection_reason'),
    rejectionExplanation: text('rejection_explanation'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('submission_votes_unique_idx').on(
      table.submissionId,
      table.approverUserId,
    ),
    index('submission_votes_submission_idx').on(table.submissionId),
  ],
)

export const submissionVoteFilters = pgTable(
  'submission_vote_filters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    voteId: uuid('vote_id')
      .notNull()
      .references(() => submissionVotes.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => submissionCourses.id, { onDelete: 'cascade' }),
    mode: modeEnum('mode').notNull(),
    nubTier: courseFilterTierEnum('nub_tier').notNull(),
    proTier: courseFilterTierEnum('pro_tier').notNull(),
    isRanked: boolean('is_ranked').notNull().default(false),
    notes: text('notes'),
  },
  (table) => [
    uniqueIndex('submission_vote_filters_unique_idx').on(
      table.voteId,
      table.courseId,
      table.mode,
    ),
    index('submission_vote_filters_vote_idx').on(table.voteId),
  ],
)

export const submissionVoteAttachments = pgTable(
  'submission_vote_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    voteId: uuid('vote_id')
      .notNull()
      .references(() => submissionVotes.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    mime: text('mime').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('submission_vote_attachments_vote_idx').on(table.voteId),
  ],
)

export const submissionDecisionAttachments = pgTable(
  'submission_decision_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    mime: text('mime').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('submission_decision_attachments_submission_idx').on(table.submissionId),
  ],
)

export const submissionFinalFilters = pgTable(
  'submission_final_filters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => submissionCourses.id, { onDelete: 'cascade' }),
    mode: modeEnum('mode').notNull(),
    nubTier: courseFilterTierEnum('nub_tier').notNull(),
    proTier: courseFilterTierEnum('pro_tier').notNull(),
    state: courseFilterStateEnum('state').notNull(),
    isRanked: boolean('is_ranked').notNull().default(false),
    notes: text('notes'),
    resolvedByUserId: uuid('resolved_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('submission_final_filters_unique_idx').on(
      table.submissionId,
      table.courseId,
      table.mode,
    ),
    index('submission_final_filters_submission_idx').on(table.submissionId),
  ],
)
