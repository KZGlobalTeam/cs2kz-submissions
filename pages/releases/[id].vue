<script setup lang="ts">
import ReleaseExportPanel from '~/components/release/ReleaseExportPanel.vue'
import ReleaseSubmissionPicker from '~/components/release/ReleaseSubmissionPicker.vue'

interface ReleaseSummary {
  id: string
  name: string
  notes: string | null
}

interface SubmissionSummary {
  id: string
  mapName: string
  status: 'pending' | 'approved' | 'rejected'
}

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})

const route = useRoute()

const { data: releases, status: releasesStatus } = await useAsyncData<ReleaseSummary[]>(
  'releases-all',
  () => $fetch<ReleaseSummary[]>('/api/releases'),
)
const { data: submissions, status: submissionsStatus } = await useAsyncData<SubmissionSummary[]>(
  'approved-submissions',
  () => $fetch<SubmissionSummary[]>('/api/submissions'),
)

const currentRelease = computed(() =>
  (releases.value ?? []).find((release) => release.id === route.params.id),
)

const approvedSubmissions = computed(() =>
  (submissions.value ?? []).filter((submission) => submission.status === 'approved'),
)

const loading = computed(
  () => releasesStatus.value === 'pending' || submissionsStatus.value === 'pending',
)
</script>

<template>
  <div class="grid gap-6">
    <UCard>
      <div v-if="loading" class="flex items-center gap-3 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        <span class="text-sm">Loading release…</span>
      </div>
      <template v-else>
        <h1 class="text-2xl font-semibold">{{ currentRelease?.name }}</h1>
        <p class="mt-2 text-sm text-muted">{{ currentRelease?.notes || 'No notes' }}</p>
      </template>
    </UCard>

    <ReleaseSubmissionPicker
      v-if="!loading"
      :release-id="String(route.params.id)"
      :approved-submissions="approvedSubmissions"
    />

    <ReleaseExportPanel :release-id="String(route.params.id)" />
  </div>
</template>
