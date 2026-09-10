import { and, asc, count, desc, eq } from 'drizzle-orm'

import { releases, releaseSubmissions, submissions } from '~/db/schema'
import type { Game } from '~/shared/schemas/game'
import { db } from '~/server/utils/db'

const releaseFields = {
  id: releases.id,
  game: releases.game,
  name: releases.name,
  notes: releases.notes,
  createdByUserId: releases.createdByUserId,
  exportedAt: releases.exportedAt,
  createdAt: releases.createdAt,
  updatedAt: releases.updatedAt,
  mapCount: count(releaseSubmissions.submissionId),
}

/** Lists the releases of exactly one game, newest first — the game-scoped
 *  read behind the releases page and the create-flow candidates. */
export async function listReleases(bounds: {
  game: Game
  limit?: number
  offset?: number
}) {
  const query = db()
    .select(releaseFields)
    .from(releases)
    .leftJoin(releaseSubmissions, eq(releaseSubmissions.releaseId, releases.id))
    .where(eq(releases.game, bounds.game))
    .groupBy(releases.id)
    .orderBy(desc(releases.createdAt))

  if (bounds.limit !== undefined) {
    query.limit(bounds.limit)
  }
  if (bounds.offset !== undefined) {
    query.offset(bounds.offset)
  }
  return query
}

export async function countReleases(game: Game) {
  const [row] = await db()
    .select({ value: count() })
    .from(releases)
    .where(eq(releases.game, game))
  return Number(row?.value ?? 0)
}

/** The release detail read: a release of the requested game only — a
 *  game-mismatched id reads as an unknown release (404), so a detail page
 *  can never render another game's release. */
export async function findReleaseById(id: string, game: Game) {
  const rows = await db()
    .select(releaseFields)
    .from(releases)
    .leftJoin(releaseSubmissions, eq(releaseSubmissions.releaseId, releases.id))
    .where(and(eq(releases.id, id), eq(releases.game, game)))
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
