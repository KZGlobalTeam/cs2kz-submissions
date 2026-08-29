import {
  createError,
  defineEventHandler,
  defineLazyEventHandler,
  getQuery,
  type H3Event,
} from 'h3'
import { z } from 'zod'

import { createDrizzleReviewReadStore } from '~/server/services/review-queue/drizzle-store'
import {
  createReviewQueueRead,
  type OwnSubmissionRow,
  type ReviewQueueRead,
  type ReviewSubmissionRow,
} from '~/server/services/review-queue/review-queue'
import type { PageBounds } from '~/server/services/review-queue/types'
import { parsePagination } from '~/server/utils/pagination'
import { requireApprover, requireAuth } from '~/server/utils/permissions'
import type { PaginatedResult } from '~/shared/types/pagination'
import type { SessionUser } from '~/shared/types/submission'

const statusSchema = z.enum(['approved', 'rejected', 'pending'])
const scopeSchema = z.enum(['mine', 'all'])

/** The submissions list endpoint's dependencies, injected so the parameter
 *  validation and the scope routing can be spec'd against fakes (the same
 *  deps-object style as the review-write and release-contents services): the
 *  bound review-queue read module plus the two auth gates. */
export interface SubmissionsIndexDeps {
  read: ReviewQueueRead
  requireAuth: (event: H3Event) => Promise<SessionUser>
  requireApprover: (event: H3Event) => Promise<SessionUser>
}

/** The submissions list endpoint as a thin adapter: `status`/`scope` are
 *  zod-validated (400 on invalid, `undefined` when absent — a typoed filter
 *  can never silently degrade to "show everything" as it did before),
 *  `unvoted` stays the coarse `=== 'true'` flag, `parsePagination` is
 *  untouched, and each scope delegates to exactly one method of the read
 *  module with the composed filters and bounds. No SQL or aggregation lives
 *  here. */
export function createSubmissionsIndexHandler(deps: SubmissionsIndexDeps) {
  return defineEventHandler(async (event) => {
    const query = getQuery(event)

    const statusParsed =
      query.status === undefined ? undefined : statusSchema.safeParse(query.status)
    if (statusParsed && !statusParsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid status filter',
      })
    }
    const status = statusParsed?.data

    const scopeParsed =
      query.scope === undefined ? undefined : scopeSchema.safeParse(query.scope)
    if (scopeParsed && !scopeParsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid scope',
      })
    }
    const scope = scopeParsed?.data ?? 'mine'

    const unvoted = query.unvoted === 'true'

    const { page, pageSize, limit, offset } = parsePagination(event)
    const bounds: PageBounds = { limit, offset }

    if (scope === 'all') {
      // Gated: only approvers (lead implies approver) see the full review queue.
      const user = await deps.requireApprover(event)

      // The approver is the queue-read identity: `viewerId` always (so myVote
      // reports on every queue read exactly as today) and, when the Unvoted
      // filter is on, the conditional spread adds the unvoted user — never
      // `unvoted: undefined`, the key's presence is what activates the
      // Unvoted branch of the filters value.
      const { items, total } = await deps.read.getQueuePage(
        {
          status,
          viewerId: user.id,
          ...(unvoted ? { unvoted: { userId: user.id } } : {}),
        },
        bounds,
      )
      return { items, total, page, pageSize } satisfies PaginatedResult<ReviewSubmissionRow>
    }

    const user = await deps.requireAuth(event)
    const { items, total } = await deps.read.getMinePage(
      { status, ownerId: user.id },
      bounds,
    )
    return { items, total, page, pageSize } satisfies PaginatedResult<OwnSubmissionRow>
  })
}

/** Production wiring, resolved lazily on the first request (never at module
 *  import — the Drizzle adapter needs the runtime config, and the specs import
 *  this file to exercise the factory against fakes): the Drizzle adapter
 *  bound to the HTTP database plus the real auth gates. */
export default defineLazyEventHandler(() =>
  createSubmissionsIndexHandler({
    read: createReviewQueueRead(createDrizzleReviewReadStore()),
    requireAuth,
    requireApprover,
  }),
)