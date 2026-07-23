<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaginatedResult } from '~/shared/types/pagination'
import type { SubmissionStatus } from '~/shared/types/submission'

definePageMeta({
  middleware: ['auth'],
})

interface SubmissionRow {
  id: string
  mapName: string
  workshopId: number
  status: SubmissionStatus
  createdAt: string
}

const { items, total, page, pageSize, status, refresh } = usePaginatedTable<SubmissionRow>(
  'submissions',
  ({ page, pageSize }) =>
    $fetch<PaginatedResult<SubmissionRow>>('/api/submissions', {
      params: { scope: 'mine', page, pageSize },
    }),
)

const rulesOpen = shallowRef(false)

const columns: TableColumn<SubmissionRow>[] = [
  { accessorKey: 'mapName', header: 'Map Name' },
  { accessorKey: 'workshopId', header: 'Workshop ID' },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  { accessorKey: 'status', header: 'Status' },
]

const statusColor = (status: SubmissionStatus) =>
  status === 'approved'
    ? 'success'
    : status === 'rejected'
      ? 'error'
      : 'neutral'

function openSubmission(id: string) {
  return navigateTo(`/submissions/${id}`)
}
</script>

<template>
  <section class="grid gap-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">My Submissions</h1>
      <div class="flex items-center gap-2">
        <UButton
          label="Refresh"
          variant="outline"
          color="neutral"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
        <UButton
          label="New Submission"
          @click="rulesOpen = true"
        />
        <SubmissionRulesDialog
          v-model:open="rulesOpen"
          @proceed="navigateTo('/submissions/new')"
        />
      </div>
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

        <template #status-cell="{ row }">
          <UBadge
            :color="statusColor(row.original.status)"
            :label="row.original.status"
            variant="subtle"
          />
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
