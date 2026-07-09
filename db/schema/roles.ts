import { index, pgEnum, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { users } from './users'

export const userRoleEnum = pgEnum('user_role', ['approver', 'lead_approver'])

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
  },
  (table) => [
    uniqueIndex('user_roles_unique_idx').on(table.userId, table.role),
    index('user_roles_role_idx').on(table.role),
  ],
)
