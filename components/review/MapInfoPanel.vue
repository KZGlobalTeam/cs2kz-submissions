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

const statusColor = computed(() =>
  props.submission.status === 'approved'
    ? 'success'
    : props.submission.status === 'rejected'
      ? 'error'
      : 'neutral',
)
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ submission.mapName }}</h1>
        <p class="mt-2 text-sm text-zinc-300">{{ submission.notes || 'No notes' }}</p>
      </div>
      <UBadge :color="statusColor" :label="submission.status" variant="subtle" />
    </div>

    <div class="mt-4 space-y-1 text-sm text-zinc-300">
      <p>
        Workshop URL:
        <a :href="submission.workshopUrl" target="_blank" rel="noopener noreferrer" class="text-accent">{{ submission.workshopUrl }}</a>
      </p>
      <p>Mappers: {{ mapperNames }}</p>
    </div>

    <div v-if="isDecided" class="mt-4 border-t border-white/5 pt-4 text-sm">
      <p class="font-semibold">Decision</p>
      <p class="mt-1 text-muted">Status: {{ submission.status }}</p>
      <p v-if="submission.decisionByName" class="mt-1 text-muted">
        By: {{ submission.decisionByName }}
      </p>
      <p v-if="approvedAtLabel" class="mt-1 text-muted">Approved: {{ approvedAtLabel }}</p>
      <p v-if="rejectedAtLabel" class="mt-1 text-muted">Rejected: {{ rejectedAtLabel }}</p>
      <p v-if="submission.decisionNotes" class="mt-2 text-danger">
        {{ submission.decisionNotes }}
      </p>
    </div>
  </UCard>
</template>
