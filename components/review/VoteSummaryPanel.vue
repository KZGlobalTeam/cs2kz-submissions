<script setup lang="ts">
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

const props = defineProps<{
  votes: SubmissionDetailVote[]
  /** When set, omit this user's own vote. */
  excludeUserId?: string
}>()

const displayed = computed<SubmissionDetailVote[]>(() =>
  props.excludeUserId
    ? props.votes.filter((vote) => vote.approverUserId !== props.excludeUserId)
    : props.votes,
)

const approvedVotes = computed(() =>
  displayed.value.filter((vote) => vote.approvalDecision === 'yes'),
)

const rejectedVotes = computed(() =>
  displayed.value.filter((vote) => vote.approvalDecision === 'no'),
)

function noteLabel(vote: SubmissionDetailVote) {
  return vote.rejectionExplanation || vote.rejectionReason || null
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
        <span v-if="noteLabel(vote)" class="text-muted">{{ noteLabel(vote) }}</span>
      </div>
    </div>

    <div v-if="rejectedVotes.length" class="space-y-2">
      <div
        v-for="vote in rejectedVotes"
        :key="vote.id"
        class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-sm"
      >
        <span class="font-medium">{{ vote.approverName }}</span>
        <UIcon name="i-lucide-x" class="text-error" />
        <span v-if="noteLabel(vote)" class="text-muted">{{ noteLabel(vote) }}</span>
      </div>
    </div>
  </div>
  <p v-else class="text-xs text-muted">No other approver votes yet</p>
</template>
