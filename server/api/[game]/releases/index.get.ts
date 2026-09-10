import { countReleases, listReleases } from '~/server/queries/list-releases'
import { parsePagination } from '~/server/utils/pagination'
import { requireLeadApprover } from '~/server/utils/permissions'
import { requireRouteGame } from '~/server/utils/route-game'
import type { PaginatedResult } from '~/shared/types/pagination'

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)
  const game = requireRouteGame(event)
  const { page, pageSize, limit, offset } = parsePagination(event)
  const [items, total] = await Promise.all([
    listReleases({ game, limit, offset }),
    countReleases(game),
  ])
  return { items, total, page, pageSize } satisfies PaginatedResult<
    Awaited<ReturnType<typeof listReleases>>[number]
  >
})
