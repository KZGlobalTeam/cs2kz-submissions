<script setup lang="ts">
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

const props = defineProps<{
  votes: SubmissionDetailVote[]
  /** When set, omit this user's own vote (used inside the vote/approve panels). */
  excludeUserId?: string
}>()

const displayed = computed(() =>
  props.excludeUserId
    ? props.votes.filter((vote) => vote.approverUserId !== props.excludeUserId)
    : props.votes,
)
</script>

<template>
  <div class="rounded-[1.25rem] border border-white/5 bg-white/5 p-4">
    <p class="mb-3 text-sm font-semibold text-muted">其他 approver 的审核状态</p>

    <p v-if="!displayed.length" class="text-sm text-muted">暂无其他 approver 的投票。</p>

    <ul v-else class="space-y-3 text-sm">
      <li v-for="vote in displayed" :key="vote.id">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium">{{ vote.approverName }}</span>
          <span class="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase tracking-[0.2em] text-muted">
            {{ vote.approvalDecision }}
          </span>
          <span v-if="vote.rejectionReason" class="text-danger">{{ vote.rejectionReason }}</span>
        </div>
        <p v-if="vote.rejectionExplanation" class="mt-1 text-muted">
          {{ vote.rejectionExplanation }}
        </p>
      </li>
    </ul>
  </div>
</template>
