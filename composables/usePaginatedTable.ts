import type { WatchSource } from 'vue'

import {
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from '~/shared/types/pagination'

export interface UsePaginatedTableOptions {
  /** Extra reactive sources that should trigger a refetch (e.g. a filter). */
  watch?: WatchSource[]
  /** Initial page size. Defaults to `DEFAULT_PAGE_SIZE`. */
  pageSize?: number
  /** useAsyncData `server` option. Defaults to `false` (client-side fetch). */
  server?: boolean
}

export function usePaginatedTable<T>(
  key: string,
  fetcher: (ctx: { page: number, pageSize: number }) => Promise<PaginatedResult<T>>,
  options: UsePaginatedTableOptions = {},
) {
  const page = ref(1)
  const pageSize = ref(options.pageSize ?? DEFAULT_PAGE_SIZE)

  const { data, status, refresh } = useAsyncData<PaginatedResult<T>>(
    key,
    () => fetcher({ page: page.value, pageSize: pageSize.value }),
    {
      watch: [page, pageSize, ...(options.watch ?? [])],
      server: options.server ?? false,
    },
  )

  const items = computed(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)

  return { data, items, total, page, pageSize, status, refresh }
}
