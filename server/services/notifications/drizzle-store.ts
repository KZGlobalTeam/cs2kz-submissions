import { count, eq, inArray } from 'drizzle-orm'

import { submissionCourses, submissions, users } from '~/db/schema'
import { db } from '~/server/utils/db'

import { toNotificationContext, type NotificationContextStore } from './types'

/** Binds the notification context read to Drizzle over the HTTP database —
 *  the notifier's own post-commit query, so the write modules never grow a
 *  store method for it (spec §Context resolution). One logical read, three
 *  statements in parallel: the submission row joined to its submitter, the
 *  course count, and the display names for the extra user ids the event
 *  facts handed over. */
export function createDrizzleNotificationStore(
  database = db(),
): NotificationContextStore {
  return {
    async readNotificationContext(submissionId, userIds) {
      const [submissionRows, courseCountRow, userRows] = await Promise.all([
        database
          .select({
            mapName: submissions.mapName,
            submitterDisplayName: users.displayName,
          })
          .from(submissions)
          .innerJoin(users, eq(submissions.createdByUserId, users.id))
          .where(eq(submissions.id, submissionId))
          .limit(1),
        database
          .select({ value: count() })
          .from(submissionCourses)
          .where(eq(submissionCourses.submissionId, submissionId)),
        userIds.length > 0
          ? database
              .select({ id: users.id, displayName: users.displayName })
              .from(users)
              .where(inArray(users.id, userIds))
          : Promise.resolve([]),
      ])

      return toNotificationContext(
        submissionRows[0],
        Number(courseCountRow[0]?.value ?? 0),
        userRows,
      )
    },
  }
}