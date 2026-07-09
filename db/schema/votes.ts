import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { submissionCourses, submissions } from './submissions'
import { timestamps, users } from './users'

export const approvalDecisionEnum = pgEnum('approval_decision', ['yes', 'no'])
export const modeEnum = pgEnum('course_mode', ['classic', 'vanilla'])
export const courseFilterTierEnum = pgEnum('course_filter_tier', [
  'very-easy',
  'easy',
  'medium',
  'advanced',
  'hard',
  'very-hard',
  'extreme',
  'death',
  'unfeasible',
  'impossible',
])
export const courseFilterStateEnum = pgEnum('course_filter_state', [
  'unranked',
  'pending',
  'ranked',
])

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
