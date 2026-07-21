<script setup lang="ts">
import type {
  SubmissionDetailMapper,
  SubmissionDetailSubmission,
} from '~/shared/types/submission-detail'

const props = defineProps<{
  submission: SubmissionDetailSubmission
  mappers: SubmissionDetailMapper[]
}>()

const mapperNames = computed(() =>
  props.mappers.map((mapper) => mapper.displayNameSnapshot).join(', '),
)

const approvedAtLabel = computed(() =>
  props.submission.approvedAt
    ? new Date(props.submission.approvedAt).toLocaleString()
    : null,
)

const rejectedAtLabel = computed(() =>
  props.submission.rejectedAt
    ? new Date(props.submission.rejectedAt).toLocaleString()
    : null,
)

const isDecided = computed(() => props.submission.status !== 'pending')
</script>

<template>
  <div class="panel rounded-[1.5rem] p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.35em] text-muted">Submission Detail</p>
        <h1 class="mt-3 text-3xl font-semibold">{{ submission.mapName }}</h1>
        <p class="mt-3 text-sm text-zinc-300">{{ submission.notes || 'No notes' }}</p>
      </div>
      <span class="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted">
        {{ submission.status }}
      </span>
    </div>

    <div class="mt-6 space-y-3 text-sm text-zinc-300">
      <p>
        Workshop URL:
        <a :href="submission.workshopUrl" target="_blank" rel="noopener noreferrer" class="text-accent">{{ submission.workshopUrl }}</a>
      </p>
      <p>Mappers: {{ mapperNames }}</p>
    </div>

    <div v-if="isDecided" class="mt-6 rounded-[1.25rem] border border-white/5 bg-white/5 p-4 text-sm">
      <p class="font-semibold">Decision</p>
      <p class="mt-2 text-muted">Status: {{ submission.status }}</p>
      <p v-if="submission.decisionByName" class="mt-1 text-muted">
        By: {{ submission.decisionByName }}
      </p>
      <p v-if="approvedAtLabel" class="mt-1 text-muted">Approved: {{ approvedAtLabel }}</p>
      <p v-if="rejectedAtLabel" class="mt-1 text-muted">Rejected: {{ rejectedAtLabel }}</p>
      <p v-if="submission.decisionNotes" class="mt-2 text-danger">
        {{ submission.decisionNotes }}
      </p>
    </div>
  </div>
</template>
