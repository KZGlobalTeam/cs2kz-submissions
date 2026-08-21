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
const toast = useToast()
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

function formatDateYearMonthDay(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}/${month}/${day}`
}

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
    { accessorKey: 'mapName', header: 'Map' },
    { accessorKey: 'workshopId', header: 'Workshop' },
    { accessorKey: 'mappers', header: 'Mappers' },
    { accessorKey: 'submittedBy', header: 'Submitted By' },
    {
      accessorKey: 'createdAt',
      header: 'Submitted On',
      cell: ({ row }) => formatDateYearMonthDay(row.original.createdAt),
    },
    { accessorKey: 'status', header: 'Status' },
    { id: 'votes', header: 'Votes' },
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

const removing = shallowRef<string | null>(null)
const pendingDelete = shallowRef<ReviewSubmissionRow | null>(null)

async function confirmDeleteSubmission() {
  const row = pendingDelete.value
  if (!row) {
    return
  }

  removing.value = row.id
  try {
    await $fetch(`/api/submissions/${row.id}`, { method: 'DELETE' })
    toast.add({ color: 'success', title: 'Submission deleted' })
    await refresh()
    // If we emptied the current page (e.g. deleted the last row), step back.
    if (items.value.length === 0 && page.value > 1) {
      page.value = page.value - 1
    }
  } finally {
    removing.value = null
    pendingDelete.value = null
  }
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
            class="-mx-1 px-1 font-medium"
            :label="row.original.mapName"
            @click="openSubmission(row.original.id)"
          />
        </template>

        <template #workshopId-cell="{ row }">
          <a
            :href="row.original.workshopUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-blue-500 underline underline-offset-2 hover:text-blue-400"
          >
            {{ row.original.workshopId }}
          </a>
        </template>

        <template #mappers-cell="{ row }">
          <span>{{ row.original.mappers.length ? row.original.mappers.join(', ') : '—' }}</span>
        </template>

        <template #submittedBy-cell="{ row }">
          <span>{{ row.original.submittedBy }}</span>
        </template>

        <template #votes-cell="{ row }">
          <div class="flex flex-wrap items-center gap-0.5">
            <UIcon
              v-for="i in row.original.yesVotes"
              :key="`yes-${i}`"
              name="i-lucide-check"
              class="size-4 text-success"
            />
            <UIcon
              v-for="i in row.original.noVotes"
              :key="`no-${i}`"
              name="i-lucide-x"
              class="size-4 text-error"
            />
          </div>
        </template>

        <template #myVote-cell="{ row }">
          <UIcon
            v-if="row.original.myVote === 'yes'"
            name="i-lucide-check"
            class="size-4 text-success"
          />
          <UIcon
            v-else-if="row.original.myVote === 'no'"
            name="i-lucide-x"
            class="size-4 text-error"
          />
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="statusColor(row.original.status)"
            :label="row.original.status"
            variant="subtle"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-if="hasApproverRole"
              variant="outline"
              color="neutral"
              label="Vote"
              :disabled="row.original.status !== 'pending'"
              @click="openVote(row.original.id)"
            />
            <UButton
              v-if="isLeadApprover"
              variant="outline"
              color="neutral"
              label="Approve"
              :disabled="row.original.status !== 'pending'"
              @click="openApprove(row.original.id)"
            />
            <UButton
              v-if="isLeadApprover"
              variant="ghost"
              color="error"
              label="Delete"
              :loading="removing === row.original.id"
              @click="pendingDelete = row.original"
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

    <CommonConfirmDialog
      :open="pendingDelete !== null"
      title="Delete submission"
      :description="pendingDelete ? `Delete “${pendingDelete.mapName}”? This permanently removes the submission, its votes, and its release links.` : undefined"
      confirm-label="Delete"
      confirm-color="error"
      :loading="removing !== null"
      @confirm="confirmDeleteSubmission"
      @cancel="pendingDelete = null"
      @update:open="(value) => { if (!value) pendingDelete = null }"
    />
  </section>
</template>
