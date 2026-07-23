<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaginatedResult } from '~/shared/types/pagination'
import type { ReviewSubmissionRow, SubmissionStatus } from '~/shared/types/submission'

definePageMeta({
  middleware: ['auth', 'approver'],
})

const VALID_STATUSES: readonly SubmissionStatus[] = ['pending', 'approved', 'rejected']

const route = useRoute()
const router = useRouter()
const { hasApproverRole, isLeadApprover } = useSession()

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

function coerceStatus(value: unknown): SubmissionStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value)
    ? (value as SubmissionStatus)
    : 'pending'
}

const statusFilter = ref<SubmissionStatus>(coerceStatus(route.query.status))

const { items, total, page, pageSize, status, refresh } = usePaginatedTable<ReviewSubmissionRow>(
  'review-submissions',
  ({ page, pageSize }) =>
    $fetch<PaginatedResult<ReviewSubmissionRow>>('/api/submissions', {
      params: {
        scope: 'all',
        status: statusFilter.value,
        page,
        pageSize,
      },
    }),
)

watch(statusFilter, (value) => {
  void router.replace({
    query: { ...route.query, status: value === 'pending' ? undefined : value },
  })
  // Reset to the first page whenever the filter changes — exactly one refetch.
  if (page.value !== 1) {
    page.value = 1
  }
  else {
    void refresh()
  }
})

const columns = computed<TableColumn<ReviewSubmissionRow>[]>(() => {
  const cols: TableColumn<ReviewSubmissionRow>[] = [
    { accessorKey: 'mapName', header: 'Map Name' },
    { accessorKey: 'workshopId', header: 'Workshop ID' },
    { accessorKey: 'mappers', header: 'Mappers' },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'voteCount', header: 'Votes' },
    { accessorKey: 'myVote', header: 'My Vote' },
  ]

  if (hasApproverRole.value || isLeadApprover.value) {
    cols.push({ id: 'actions', header: 'Actions' })
  }

  return cols
})

const statusColor = (status: SubmissionStatus) =>
  status === 'approved'
    ? 'success'
    : status === 'rejected'
      ? 'error'
      : 'neutral'

function openSubmission(id: string) {
  return navigateTo(`/submissions/${id}`)
}

function openVote(id: string) {
  return navigateTo(`/submissions/${id}?mode=vote`)
}

function openApprove(id: string) {
  return navigateTo(`/submissions/${id}?mode=approve`)
}
</script>

<template>
  <section class="grid gap-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">Submissions</h1>
      <UButton
        label="Refresh"
        variant="outline"
        color="neutral"
        :loading="status === 'pending'"
        @click="() => refresh()"
      />
    </div>

    <div class="flex items-center gap-3">
      <span class="text-sm text-muted">Status</span>
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        class="w-40"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        class="min-w-0"
      >
        <template #mapName-cell="{ row }">
          <UButton
            variant="ghost"
            color="neutral"
            class="px-0 font-medium"
            :label="row.original.mapName"
            @click="openSubmission(row.original.id)"
          />
        </template>

        <template #workshopId-cell="{ row }">
          <a
            :href="row.original.workshopUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-500 underline hover:text-blue-400"
          >
            {{ row.original.workshopId }}
          </a>
        </template>

        <template #mappers-cell="{ row }">
          <span>{{ row.original.mappers.length ? row.original.mappers.join(', ') : '—' }}</span>
        </template>

        <template #voteCount-cell="{ row }">
          <span>{{ row.original.voteCount }}</span>
        </template>

        <template #myVote-cell="{ row }">
          <UBadge
            v-if="row.original.myVote"
            color="success"
            label="Voted"
            variant="subtle"
          />
          <span v-else class="text-muted">—</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="statusColor(row.original.status)"
            :label="row.original.status"
            variant="subtle"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-2">
            <UButton
              v-if="hasApproverRole"
              variant="outline"
              label="Vote"
              :disabled="row.original.status !== 'pending'"
              @click="openVote(row.original.id)"
            />
            <UButton
              v-if="isLeadApprover"
              label="Approve"
              :disabled="row.original.status !== 'pending'"
              @click="openApprove(row.original.id)"
            />
          </div>
        </template>
      </UTable>

      <CommonTablePagination
        :page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="page = $event"
        @update:page-size="pageSize = $event"
      />
    </UCard>
  </section>
</template>
