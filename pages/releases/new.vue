<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ReviewSubmissionRow } from '~/shared/types/submission'

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})

const toast = useToast()

const name = shallowRef('')
const notes = shallowRef('')
const creating = shallowRef(false)

const { data: submissions, status } = useAsyncData<ReviewSubmissionRow[]>(
  'approved-submissions-new',
  () => $fetch<ReviewSubmissionRow[]>('/api/submissions', {
    params: { scope: 'all', status: 'approved' },
  }),
  { server: false },
)

// Approved submissions sorted by approval time (most recent first).
const approvedSubmissions = computed(() =>
  [...(submissions.value ?? [])].sort((a, b) => {
    const aTime = a.approvedAt ? Date.parse(a.approvedAt) : 0
    const bTime = b.approvedAt ? Date.parse(b.approvedAt) : 0
    return bTime - aTime
  }),
)

const selected = shallowRef<ReviewSubmissionRow[]>([])
const selectedIds = computed(() => new Set(selected.value.map((row) => row.id)))

const columns: TableColumn<ReviewSubmissionRow>[] = [
  { accessorKey: 'mapName', header: 'Map' },
  { id: 'actions', header: '' },
]

function addToRelease(submission: ReviewSubmissionRow) {
  if (selectedIds.value.has(submission.id)) {
    return
  }
  selected.value = [...selected.value, submission]
}

function removeFromRelease(submission: ReviewSubmissionRow) {
  selected.value = selected.value.filter((row) => row.id !== submission.id)
}

async function createRelease() {
  if (!name.value.trim()) {
    toast.add({ color: 'error', title: 'Release name is required' })
    return
  }
  creating.value = true
  try {
    await $fetch('/api/releases', {
      method: 'POST',
      body: {
        name: name.value,
        notes: notes.value || null,
        submissionIds: selected.value.map((row) => row.id),
      },
    })
    toast.add({ color: 'success', title: 'Release created' })
    await navigateTo('/releases')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <h1 class="text-2xl font-semibold">New Release</h1>

    <UCard>
      <div class="grid gap-4">
        <UFormField label="Release title" required>
          <UInput v-model="name" placeholder="Release name" class="w-full" />
        </UFormField>
        <UFormField label="Notes">
          <UTextarea
            v-model="notes"
            :rows="3"
            placeholder="Notes"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold">Selected Maps</h2>
        <span class="text-sm text-muted">
          {{ selected.length }} map(s)
        </span>
      </div>

      <div
        v-if="selected.length"
        class="mb-4 flex flex-wrap gap-2"
      >
        <div
          v-for="submission in selected"
          :key="submission.id"
          class="flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-sm"
        >
          <span>{{ submission.mapName }}</span>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            :aria-label="`Remove ${submission.mapName}`"
            @click="removeFromRelease(submission)"
          />
        </div>
      </div>
      <p v-else class="mb-4 text-sm text-muted">
        No maps added yet. Pick from the approved submissions below.
      </p>

      <h2 class="mb-3 text-lg font-semibold">Approved Submissions</h2>
      <UTable
        :data="approvedSubmissions"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              v-if="selectedIds.has(row.original.id)"
              variant="soft"
              color="neutral"
              label="Added"
              icon="i-lucide-check"
              disabled
            />
            <UButton
              v-else
              variant="outline"
              label="Add to release"
              icon="i-lucide-plus"
              @click="addToRelease(row.original)"
            />
          </div>
        </template>
      </UTable>

      <div class="mt-4 flex justify-end gap-2">
        <UButton
          label="Cancel"
          variant="outline"
          color="neutral"
          @click="navigateTo('/releases')"
        />
        <UButton
          label="Create Release"
          icon="i-lucide-check"
          :loading="creating"
          @click="createRelease"
        />
      </div>
    </UCard>
  </div>
</template>
