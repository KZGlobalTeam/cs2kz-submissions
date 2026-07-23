import { getQuery } from 'h3'
import { z } from 'zod'

import {
  countAllSubmissions,
  countOwnSubmissions,
  listAllSubmissionsForReview,
  listOwnSubmissions,
  type PageBounds,
} from '~/server/queries/list-submissions'
import { parsePagination } from '~/server/utils/pagination'
import { requireApprover, requireAuth } from '~/server/utils/permissions'
import type { PaginatedResult } from '~/shared/types/pagination'

const statusSchema = z.enum(['approved', 'rejected', 'pending'])
const scopeSchema = z.enum(['mine', 'all'])

export default defineEventHandler(async (event) => {
  const rawStatus = getQuery(event).status
  const statusParsed =
    rawStatus === undefined ? undefined : statusSchema.safeParse(rawStatus)
  const status = statusParsed && statusParsed.success ? statusParsed.data : undefined

  const rawScope = getQuery(event).scope
  const scopeParsed = rawScope === undefined ? undefined : scopeSchema.safeParse(rawScope)
  const scope = scopeParsed && scopeParsed.success ? scopeParsed.data : 'mine'

  const { page, pageSize, limit, offset } = parsePagination(event)
  const bounds: PageBounds = { limit, offset }

  if (scope === 'all') {
    // Gated: only approvers (lead implies approver) see the full review queue.
    const user = await requireApprover(event)
    const [items, total] = await Promise.all([
      listAllSubmissionsForReview(status, user.id, bounds),
      countAllSubmissions(status),
    ])
    return { items, total, page, pageSize } satisfies PaginatedResult<unknown>
  }

  const user = await requireAuth(event)
  const [items, total] = await Promise.all([
    listOwnSubmissions(user.id, status, bounds),
    countOwnSubmissions(user.id, status),
  ])
  return { items, total, page, pageSize } satisfies PaginatedResult<unknown>
})
