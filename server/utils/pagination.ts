import { getQuery, type H3Event } from 'h3'
import { z } from 'zod'

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '~/shared/types/pagination'

const pageSchema = z.coerce.number().int().min(1).max(100_000)
const pageSizeSchema = z.coerce.number().int().min(1).max(MAX_PAGE_SIZE)

export interface Pagination {
  page: number
  pageSize: number
  limit: number
  offset: number
}

export function parsePagination(event: H3Event): Pagination {
  const query = getQuery(event)

  const pageParsed = pageSchema.safeParse(query.page ?? 1)
  const page = pageParsed.success ? pageParsed.data : 1

  const pageSizeParsed = pageSizeSchema.safeParse(query.pageSize ?? DEFAULT_PAGE_SIZE)
  const pageSize = pageSizeParsed.success
    ? Math.min(pageSizeParsed.data, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
}
