import { getQuery } from 'h3'
import { z } from 'zod'

import { listAllSubmissions, listOwnSubmissions } from '~/server/queries/list-submissions'
import { requireApprover, requireAuth } from '~/server/utils/permissions'

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

  if (scope === 'all') {
    // Gated: only approvers (lead implies approver) see the full review queue.
    await requireApprover(event)
    return listAllSubmissions(status)
  }

  const user = await requireAuth(event)
  return listOwnSubmissions(user.id, status)
})
