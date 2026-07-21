<script setup lang="ts">
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

const props = defineProps<{
  votes: SubmissionDetailVote[]
  /** When set, omit this user's own vote. */
  excludeUserId?: string
}>()

const displayed = computed(() =>
  props.excludeUserId
    ? props.votes.filter((vote) => vote.approverUserId !== props.excludeUserId)
    : props.votes,
)
</script>

<template>
  <div v-if="displayed.length" class="flex flex-wrap items-center gap-2">
    <span class="text-xs text-muted">Other approvers</span>
    <UBadge
      v-for="vote in displayed"
      :key="vote.id"
      :color="vote.approvalDecision === 'yes' ? 'success' : 'error'"
      variant="subtle"
      class="gap-1"
    >
      <UIcon
        :name="vote.approvalDecision === 'yes' ? 'i-lucide-check' : 'i-lucide-x'"
      />
      <span>{{ vote.approverName }}</span>
      <span v-if="vote.rejectionReason" class="text-muted">· {{ vote.rejectionReason }}</span>
    </UBadge>
  </div>
  <p v-else class="text-xs text-muted">No other approver votes yet</p>
</template>
