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
const releasesEndpoint = '/api/releases' as string
const submissionsEndpoint = '/api/submissions' as string

const { data: releases } = await useAsyncData<ReleaseSummary[]>('releases-all', () =>
  $fetch<ReleaseSummary[]>(releasesEndpoint),
)
const { data: submissions } = await useAsyncData<SubmissionSummary[]>('approved-submissions', () =>
  $fetch<SubmissionSummary[]>(submissionsEndpoint),
)

const currentRelease = computed(() =>
  (releases.value ?? []).find((release) => release.id === route.params.id),
)

const approvedSubmissions = computed(() =>
  (submissions.value ?? []).filter((submission) => submission.status === 'approved'),
)
</script>

<template>
  <div class="grid gap-6">
    <section class="panel rounded-[1.5rem] p-5">
      <h1 class="text-3xl font-semibold">{{ currentRelease?.name }}</h1>
      <p class="mt-2 text-sm text-muted">{{ currentRelease?.notes || 'No notes' }}</p>
    </section>

    <ReleaseSubmissionPicker
      :release-id="String(route.params.id)"
      :approved-submissions="approvedSubmissions"
    />

    <ReleaseExportPanel :release-id="String(route.params.id)" />
  </div>
</template>
