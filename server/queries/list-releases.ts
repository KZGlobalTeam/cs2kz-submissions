import { asc, count, desc, eq } from 'drizzle-orm'

import { releases, releaseSubmissions, submissions } from '~/db/schema'
import { db } from '~/server/utils/db'

const releaseFields = {
  id: releases.id,
  name: releases.name,
  notes: releases.notes,
  createdByUserId: releases.createdByUserId,
  exportedAt: releases.exportedAt,
  createdAt: releases.createdAt,
  updatedAt: releases.updatedAt,
  mapCount: count(releaseSubmissions.submissionId),
}

export async function listReleases(bounds?: { limit?: number, offset?: number }) {
  const query = db()
    .select(releaseFields)
    .from(releases)
    .leftJoin(releaseSubmissions, eq(releaseSubmissions.releaseId, releases.id))
    .groupBy(releases.id)
    .orderBy(desc(releases.createdAt))

  if (bounds?.limit !== undefined) {
    query.limit(bounds.limit)
  }
  if (bounds?.offset !== undefined) {
    query.offset(bounds.offset)
  }
  return query
}

export async function countReleases() {
  const [row] = await db()
    .select({ value: count() })
    .from(releases)
  return Number(row?.value ?? 0)
}

export async function findReleaseById(id: string) {
  const rows = await db()
    .select(releaseFields)
    .from(releases)
    .leftJoin(releaseSubmissions, eq(releaseSubmissions.releaseId, releases.id))
    .where(eq(releases.id, id))
    .groupBy(releases.id)
    .limit(1)
  return rows[0] ?? null
}

export async function listReleaseSubmissions(releaseId: string) {
  return db()
    .select({
      id: submissions.id,
      mapName: submissions.mapName,
    })
    .from(releaseSubmissions)
    .innerJoin(submissions, eq(submissions.id, releaseSubmissions.submissionId))
    .where(eq(releaseSubmissions.releaseId, releaseId))
    .orderBy(asc(submissions.mapName))
}
