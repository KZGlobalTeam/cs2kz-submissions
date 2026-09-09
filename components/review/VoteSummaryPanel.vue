<script setup lang="ts">
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

import AttachmentLightbox from '../common/AttachmentLightbox.vue'

const props = defineProps<{
  votes: SubmissionDetailVote[]
  /** When set, omit this user's own vote. Ignored in the decided context:
   *  the Status of Approval record always shows every Vote. */
  excludeUserId?: string
  /** Render in the decided-submission context used by the Status of Approval
   *  section: no self-exclusion, and an empty state written for a terminal
   *  page — a decided submission can legally carry zero Votes (ADR-0007
   *  lead-only finalization), so the pending-review copy ("no other approver
   *  votes yet") never appears. The pending review panels never set this. */
  terminal?: boolean
}>()

/** The votes this panel renders. The decided context (`terminal`) shows every
 *  Vote — the viewer's own included — while the pending review panels hide
 *  the viewer's own Vote behind `excludeUserId`. */
const displayed = computed<SubmissionDetailVote[]>(() => {
  if (props.terminal) {
    return props.votes
  }
  return props.excludeUserId
    ? props.votes.filter((vote) => vote.approverUserId !== props.excludeUserId)
    : props.votes
})

const approvedVotes = computed(() =>
  displayed.value.filter((vote) => vote.approvalDecision === 'yes'),
)

const rejectedVotes = computed(() =>
  displayed.value.filter((vote) => vote.approvalDecision === 'no'),
)

function sideNote(vote: SubmissionDetailVote) {
  // One text field per decision side: the Approval note on a yes vote, the
  // Rejection reason on a no vote. The removed explanation no longer exists.
  return vote.approvalDecision === 'yes' ? vote.approvalNote : vote.rejectionReason
}

/** Lightbox state for a single reason card's attachment set. */
const lightbox = ref<{ vote: SubmissionDetailVote; index: number } | null>(null)

function openAttachments(vote: SubmissionDetailVote, index: number) {
  lightbox.value = { vote, index }
}
</script>

<template>
  <div v-if="displayed.length" class="space-y-3">
    <div v-if="approvedVotes.length" class="flex flex-wrap items-center gap-3">
      <div
        v-for="vote in approvedVotes"
        :key="vote.id"
        class="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
      >
        <span class="font-medium">{{ vote.approverName }}</span>
        <UIcon name="i-lucide-check" class="text-success" />
        <span v-if="sideNote(vote)" class="text-muted">{{ sideNote(vote) }}</span>
      </div>
    </div>

    <div v-if="rejectedVotes.length" class="space-y-2">
      <div
        v-for="vote in rejectedVotes"
        :key="vote.id"
        class="rounded-md border border-error/20 bg-error/10 px-3 py-2 text-sm"
      >
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="font-medium">{{ vote.approverName }}</span>
          <UIcon name="i-lucide-x" class="text-error" />
          <span v-if="sideNote(vote)" class="text-muted">{{ sideNote(vote) }}</span>
        </div>

        <div v-if="vote.attachments.length" class="mt-2 flex flex-wrap gap-2">
          <img
            v-for="(attachment, index) in vote.attachments"
            :key="attachment.url"
            :src="attachment.url"
            :alt="`${vote.approverName} rejection attachment ${index + 1}`"
            class="h-16 w-24 cursor-zoom-in rounded-md border border-white/10 object-cover"
            @click="openAttachments(vote, index)"
          >
        </div>
      </div>
    </div>
  </div>
  <p v-else-if="terminal" class="text-xs text-muted">No approver votes were recorded</p>
  <p v-else class="text-xs text-muted">No other approver votes yet</p>

  <AttachmentLightbox
    :open="lightbox !== null"
    :items="lightbox?.vote.attachments ?? []"
    :start="lightbox?.index ?? 0"
    @update:open="lightbox = $event ? lightbox : null"
  />
</template>