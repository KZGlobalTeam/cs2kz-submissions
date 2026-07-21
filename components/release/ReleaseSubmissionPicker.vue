<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface SubmissionSummary {
  id: string
  mapName: string
}

const props = defineProps<{
  releaseId: string
  approvedSubmissions: SubmissionSummary[]
}>()

const toast = useToast()
const adding = shallowRef<string | null>(null)

const columns: TableColumn<SubmissionSummary>[] = [
  { accessorKey: 'mapName', header: 'Map' },
  { id: 'actions', header: '' },
]

async function addToRelease(submission: SubmissionSummary) {
  adding.value = submission.id
  try {
    await $fetch(`/api/releases/${props.releaseId}/submissions`, {
      method: 'POST',
      body: { submissionId: submission.id },
    })
    toast.add({ color: 'success', title: 'Added to release' })
  } finally {
    adding.value = null
  }
}
</script>

<template>
  <UCard>
    <h2 class="mb-4 text-lg font-semibold">Approved Submissions</h2>
    <UTable :data="approvedSubmissions" :columns="columns">
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            size="xs"
            variant="outline"
            icon="i-lucide-plus"
            label="Add to release"
            :loading="adding === row.original.id"
            @click="addToRelease(row.original)"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>
