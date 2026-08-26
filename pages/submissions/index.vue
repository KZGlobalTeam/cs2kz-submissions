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
  /** Computed per row by the "mine" list endpoint so the owner actions can
   *  be hidden the moment review has started, without an extra request. */
  voteCount: number
}

const { items, total, page, pageSize, status, refresh } = usePaginatedTable<SubmissionRow>(
  'submissions',
  ({ page, pageSize }) =>
    $fetch<PaginatedResult<SubmissionRow>>('/api/submissions', {
      params: { scope: 'mine', page, pageSize },
    }),
)

const rulesOpen = shallowRef(false)
const toast = useToast()

/** The owner may delete a submission only while it is pending and unreviewed
 *  (zero approver votes). The action is hidden at render time as soon as any
 *  vote exists, so the blocked state is never reachable from the UI. */
const ownerActionsVisible = (row: SubmissionRow) =>
  row.status === 'pending' && row.voteCount === 0

const columns: TableColumn<SubmissionRow>[] = [
  { accessorKey: 'mapName', header: 'Map' },
  { accessorKey: 'workshopId', header: 'Workshop' },
  {
    accessorKey: 'createdAt',
    header: 'Submitted On',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' },
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

const removing = shallowRef<string | null>(null)
const pendingDelete = shallowRef<SubmissionRow | null>(null)

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
  }
  catch (error: unknown) {
    const message = error && typeof error === 'object' && 'statusMessage' in error
      ? String((error as { statusMessage: unknown }).statusMessage)
      : 'Failed to delete submission'
    toast.add({
      color: 'error',
      title: 'Delete failed',
      description: message,
    })
  }
  finally {
    removing.value = null
    pendingDelete.value = null
  }
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
            class="-mx-1 px-1 font-medium"
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

        <template #actions-cell="{ row }">
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-if="ownerActionsVisible(row.original)"
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
      :description="pendingDelete ? `Delete “${pendingDelete.mapName}”? This permanently removes the submission and its uploaded images; it cannot be undone.` : undefined"
      confirm-label="Delete"
      confirm-color="error"
      :loading="removing !== null"
      @confirm="confirmDeleteSubmission"
      @cancel="pendingDelete = null"
      @update:open="(value) => { if (!value) pendingDelete = null }"
    />
  </section>
</template>
