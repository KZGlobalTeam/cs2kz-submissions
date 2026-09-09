<script setup lang="ts">
import type { RejectionAttachment } from '~/shared/types/attachment'
import type { SubmissionDetailSubmission } from '~/shared/types/submission-detail'

import AttachmentLightbox from '../common/AttachmentLightbox.vue'

/**
 * The lead's final Decision on the details page of decided (approved or
 * rejected) submissions, read-only, rendered for every role. Shows the same
 * material the map info card used to carry at its bottom: status, decided-by
 * name, the approved/rejected timestamps, the Decision note, and the
 * revealed Rejection attachments (openable in the existing lightbox). Not to
 * be confused with LeadDecisionPanel — the editable decision form a lead
 * approver fills in while the submission is still pending. Pending
 * submissions never render this panel.
 */
const props = defineProps<{
  submission: SubmissionDetailSubmission
  decisionAttachments: RejectionAttachment[]
}>()

function formatTimestamp(value: string | null): string | null {
  return value ? new Date(value).toLocaleString() : null
}

const approvedAtLabel = computed(() => formatTimestamp(props.submission.approvedAt))

const rejectedAtLabel = computed(() => formatTimestamp(props.submission.rejectedAt))

const lightboxIndex = ref<number | null>(null)
</script>

<template>
  <UCard>
    <div class="text-sm">
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
      <!-- The lead approver's rejection attachments, revealed to the mapper
           once the Decision lands (only populated for rejections). -->
      <div v-if="decisionAttachments.length" class="mt-3 flex flex-wrap gap-2">
        <img
          v-for="(attachment, index) in decisionAttachments"
          :key="attachment.url"
          :src="attachment.url"
          :alt="`Lead rejection attachment ${index + 1}`"
          class="h-20 w-32 cursor-zoom-in rounded-md border border-white/10 object-cover"
          @click="lightboxIndex = index"
        >
      </div>
    </div>
  </UCard>

  <AttachmentLightbox
    :open="lightboxIndex !== null"
    :items="decisionAttachments"
    :start="lightboxIndex ?? 0"
    @update:open="lightboxIndex = $event ? lightboxIndex : null"
  />
</template>