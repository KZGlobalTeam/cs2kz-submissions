<script setup lang="ts">
interface ReleaseSubmission {
  id: string
  mapName: string
}

interface ReleaseDetail {
  id: string
  name: string
  notes: string | null
  mapCount: number
  createdAt: string
  submissions: ReleaseSubmission[]
}

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})

const route = useRoute()

const { data: release, status, refresh } = useAsyncData<ReleaseDetail>(
  'release-detail',
  () => $fetch<ReleaseDetail>(`/api/releases/${route.params.id}`),
  { server: false },
)
</script>

<template>
  <div class="grid gap-6">
    <UCard>
      <div v-if="!release" class="flex items-center gap-3 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        <span class="text-sm">Loading release…</span>
      </div>
      <template v-else>
        <h1 class="text-2xl font-semibold">{{ release.name }}</h1>
        <p class="mt-2 text-sm text-muted">{{ release.notes || 'No notes' }}</p>
      </template>
    </UCard>

    <UCard>
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold">Maps</h2>
        <UButton
          label="Refresh"
          variant="outline"
          color="neutral"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
      </div>
      <div
        v-if="release?.submissions.length"
        class="flex flex-wrap gap-2"
      >
        <span
          v-for="submission in release.submissions"
          :key="submission.id"
          class="rounded-md bg-elevated px-2 py-1 text-sm"
        >{{ submission.mapName }}</span>
      </div>
      <p v-else class="text-sm text-muted">
        No maps in this release.
      </p>
    </UCard>
  </div>
</template>
