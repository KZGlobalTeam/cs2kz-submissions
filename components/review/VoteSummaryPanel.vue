<script setup lang="ts">
defineProps<{
  votes: Array<{
    id: string
    approverName: string
    approvalDecision: string
    rejectionReason: string | null
    rejectionExplanation: string | null
    filters: Array<{
      courseId: string
      mode: string
      nubTier: string
      proTier: string
      isRanked: boolean
      notes: string | null
    }>
  }>
}>()
</script>

<template>
  <section class="panel rounded-[1.5rem] p-5">
    <div class="mb-4">
      <h2 class="text-xl font-semibold">Other Approver Votes</h2>
      <p class="mt-2 text-sm text-muted">当前 submission 上所有 approver 的最新审核意见。</p>
    </div>

    <div class="space-y-4">
      <div
        v-for="vote in votes"
        :key="vote.id"
        class="rounded-[1.25rem] border border-white/5 bg-white/5 p-4"
      >
        <div class="mb-3 flex items-center justify-between">
          <p class="font-medium">{{ vote.approverName }}</p>
          <span class="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted">
            {{ vote.approvalDecision }}
          </span>
        </div>

        <p v-if="vote.rejectionReason" class="text-sm text-danger">
          {{ vote.rejectionReason }}
        </p>
        <p v-if="vote.rejectionExplanation" class="mt-2 text-sm text-zinc-300">
          {{ vote.rejectionExplanation }}
        </p>

        <div class="mt-4 space-y-2 text-sm text-zinc-300">
          <div v-for="filter in vote.filters" :key="`${vote.id}-${filter.courseId}-${filter.mode}`">
            {{ filter.mode }} | nub {{ filter.nubTier }} | pro {{ filter.proTier }} | ranked {{ filter.isRanked ? 'yes' : 'no' }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
