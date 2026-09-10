import { pgEnum } from 'drizzle-orm/pg-core'

import { gameValues } from '../../shared/schemas/game'

/** The games the portal serves. Every submission and release row carries
 *  one, so the database never depends on client context — the route is
 *  navigation, the row is truth.
 *
 *  Derives from the shared value array so the DB enum cannot drift from the
 *  schema the route segments validate against (same pattern as `modeEnum` in
 *  `votes.ts`). */
export const gameEnum = pgEnum('game', gameValues)