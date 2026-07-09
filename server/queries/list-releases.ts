import { desc } from 'drizzle-orm'

import { releases } from '~/db/schema'
import { db } from '~/server/utils/db'

export async function listReleases() {
  return db().select().from(releases).orderBy(desc(releases.createdAt))
}
