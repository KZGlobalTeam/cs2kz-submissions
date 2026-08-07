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
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-semibold">{{ submission.mapName }}</h1>
      <UBadge :color="statusColor" :label="submission.status" variant="subtle" />
    </div>

    <div v-if="submission.notes" class="mt-2 text-sm">
      <p class="text-muted">Notes:</p>
      <p class="mt-0.5 text-zinc-300">{{ submission.notes }}</p>
    </div>

    <div class="mt-4 space-y-1 text-sm">
      <p>
        <span class="text-muted">Workshop URL:</span>
        <a :href="submission.workshopUrl" target="_blank" rel="noopener noreferrer" class="ml-1 text-blue-500 underline hover:text-blue-400">{{ submission.workshopUrl }}</a>
      </p>
      <p>
        <span class="text-muted">Mappers:</span>
        <span class="ml-1 text-zinc-300">{{ mapperNames }}</span>
      </p>
    </div>

    <div v-if="submission.isPort" class="mt-4 border-t border-white/5 pt-4 text-sm">
      <p class="font-semibold">Ported Map</p>
      <div v-if="submission.portAuthorizationImageUrl" class="mt-3">
        <p class="mb-2 text-muted">Proof of Authorization:</p>
        <a
          :href="submission.portAuthorizationImageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block"
        >
          <img
            :src="submission.portAuthorizationImageUrl"
            alt="Original author authorization screenshot"
            class="h-auto max-h-64 w-auto rounded-md border border-white/10"
          >
        </a>
      </div>
      <div v-if="submission.portNotes" class="mt-3">
        <p class="mb-1 text-muted">Notes:</p>
        <p class="text-zinc-300">{{ submission.portNotes }}</p>
      </div>
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
