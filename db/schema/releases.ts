import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { submissions } from './submissions'
import { timestamps, users } from './users'

export const releases = pgTable(
  'releases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    exportedAt: timestamp('exported_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('releases_created_by_idx').on(table.createdByUserId),
    uniqueIndex('releases_name_idx').on(table.name),
  ],
)

export const releaseSubmissions = pgTable(
  'release_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    releaseId: uuid('release_id')
      .notNull()
      .references(() => releases.id, { onDelete: 'cascade' }),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('release_submissions_unique_idx').on(
      table.releaseId,
      table.submissionId,
    ),
    index('release_submissions_release_idx').on(table.releaseId),
  ],
)
