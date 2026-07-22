<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
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

const route = useRoute()
const router = useRouter()
const { isApprover, hasApproverRole, isLeadApprover } = useSession()

const ALL = 'all'

const statusOptions = [
  { label: 'All', value: ALL },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Pending', value: 'pending' },
]

const isAll = (value: string) => !value || value === ALL

const statusFilter = ref<string>(
  isAll(typeof route.query.status === 'string' ? route.query.status : '')
    ? ALL
    : route.query.status as string,
)

const { data: submissions, status, refresh } = useAsyncData<SubmissionRow[]>(
  'submissions',
  () =>
    $fetch<SubmissionRow[]>('/api/submissions', {
      params: isAll(statusFilter.value) ? undefined : { status: statusFilter.value },
    }),
  { watch: [statusFilter], server: false },
)

watch(statusFilter, (value) => {
  void router.replace({
    query: isAll(value)
      ? { ...route.query, status: undefined }
      : { ...route.query, status: value },
  })
})

const heading = computed(() => (isApprover.value ? 'Submissions' : 'My Submissions'))

const showStatusFilter = computed(() => isApprover.value)

const columns = computed<TableColumn<SubmissionRow>[]>(() => {
  const cols: TableColumn<SubmissionRow>[] = [
    { accessorKey: 'mapName', header: 'Map Name' },
    { accessorKey: 'workshopId', header: 'Workshop ID' },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    { accessorKey: 'status', header: 'Status' },
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
      <h1 class="text-2xl font-semibold">{{ heading }}</h1>
      <div class="flex items-center gap-2">
        <UButton
          label="Refresh"
          variant="outline"
          color="neutral"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
        <UButton
          to="/submissions/new"
          label="New Submission"
        />
      </div>
    </div>

    <div v-if="showStatusFilter" class="flex items-center gap-3">
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
        :data="submissions ?? []"
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
    </UCard>
  </section>
</template>
