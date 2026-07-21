import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { timestamps, users } from './users'

export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'approved',
  'rejected',
])

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    workshopUrl: text('workshop_url').notNull(),
    workshopId: bigint('workshop_id', { mode: 'number' }).notNull(),
    mapName: text('map_name').notNull(),
    notes: text('notes'),
    status: submissionStatusEnum('status').default('pending').notNull(),
    decisionByUserId: uuid('decision_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    decisionNotes: text('decision_notes'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('submissions_created_by_idx').on(table.createdByUserId),
    index('submissions_status_idx').on(table.status),
    index('submissions_workshop_id_idx').on(table.workshopId),
  ],
)

export const submissionMappers = pgTable(
  'submission_mappers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    steamId64: text('steam_id64').notNull(),
    steamId: text('steam_id').notNull(),
    displayNameSnapshot: text('display_name_snapshot').notNull(),
  },
  (table) => [
    index('submission_mappers_submission_idx').on(table.submissionId),
    uniqueIndex('submission_mappers_unique_idx').on(
      table.submissionId,
      table.steamId64,
    ),
  ],
)

export const submissionCourses = pgTable(
  'submission_courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
    name: text('name').notNull(),
    imageUrl: text('image_url').notNull(),
    imageMime: text('image_mime').notNull(),
    imageWidth: integer('image_width').notNull(),
    imageHeight: integer('image_height').notNull(),
    imageSizeBytes: integer('image_size_bytes').notNull(),
    ...timestamps,
  },
  (table) => [
    index('submission_courses_submission_idx').on(table.submissionId),
    uniqueIndex('submission_courses_submission_name_idx').on(
      table.submissionId,
      table.name,
    ),
  ],
)

export const submissionCourseMappers = pgTable(
  'submission_course_mappers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => submissionCourses.id, { onDelete: 'cascade' }),
    steamId64: text('steam_id64').notNull(),
    steamId: text('steam_id').notNull(),
    displayNameSnapshot: text('display_name_snapshot').notNull(),
  },
  (table) => [
    index('submission_course_mappers_course_idx').on(table.courseId),
    uniqueIndex('submission_course_mappers_unique_idx').on(
      table.courseId,
      table.steamId64,
    ),
  ],
)
