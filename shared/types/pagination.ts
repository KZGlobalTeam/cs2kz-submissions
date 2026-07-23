export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export const MAX_PAGE_SIZE = 100

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
