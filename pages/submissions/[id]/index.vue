<script setup lang="ts">
import type { SubmissionDetailResponse } from '~/shared/types/submission-detail'

import ApproverVoteForm from '~/components/review/ApproverVoteForm.vue'
import CoursesReadonly from '~/components/review/CoursesReadonly.vue'
import LeadDecisionPanel from '~/components/review/LeadDecisionPanel.vue'
import MapInfoPanel from '~/components/review/MapInfoPanel.vue'

type PanelMode = 'vote' | 'approve'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const { session, hasApproverRole, isLeadApprover, refreshSession } = useSession()

const submissionId = computed(() => String(route.params.id))

void callOnce(async () => {
  await refreshSession()
})

const { data: details } = useAsyncData<SubmissionDetailResponse>(
  `submission-${submissionId.value}`,
  () => $fetch<SubmissionDetailResponse>(`/api/submissions/${submissionId.value}`),
  { server: false },
)

const userId = computed(() => session.value.user?.id ?? '')

const isPending = computed(() => details.value?.submission.status === 'pending')

const defaultMode = computed<PanelMode | null>(() => {
  if (isLeadApprover.value) {
    return 'approve'
  }
  if (hasApproverRole.value) {
    return 'vote'
  }
  return null
})

const mode = computed<PanelMode | null>(() => {
  const query = route.query.mode
  if (query === 'vote' && hasApproverRole.value) {
    return 'vote'
  }
  if (query === 'approve' && isLeadApprover.value) {
    return 'approve'
  }
  return defaultMode.value
})

const showReadonlyCourses = computed(
  () => !isPending.value || mode.value === null,
)

// Remount the forms after a payload refresh so they re-seed from the latest
// server state (prefill for the vote panel; fresh state for the lead panel).
const voteFormKey = computed(() => {
  const selfVote = details.value?.votes.find(
    (vote) => vote.approverUserId === userId.value,
  )
  return selfVote?.updatedAt ?? 'none'
})

const decisionFormKey = computed(
  () => details.value?.submission.updatedAt ?? 'none',
)

async function onSaved() {
  await navigateTo('/review')
}

onMounted(() => {
  const query = route.query.mode
  if (
    !((query === 'vote' && hasApproverRole.value) ||
       (query === 'approve' && isLeadApprover.value)) &&
    defaultMode.value
  ) {
    void router.replace({ query: { ...route.query, mode: defaultMode.value } })
  }
})
</script>

<template>
  <section v-if="!details" class="grid gap-6">
    <UCard>
      <div class="flex items-center gap-3 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        <span class="text-sm">Loading submission…</span>
      </div>
    </UCard>
  </section>

  <section v-else-if="details" class="grid gap-6">
    <MapInfoPanel
      :submission="details.submission"
      :mappers="details.mappers"
      :decision-attachments="details.decisionAttachments"
    />

    <ApproverVoteForm
      v-if="isPending && mode === 'vote' && hasApproverRole"
      :key="`vote-${voteFormKey}`"
      :submission-id="details.submission.id"
      :courses="details.courses"
      :votes="details.votes"
      :current-user-id="userId"
      @saved="onSaved"
    />

    <LeadDecisionPanel
      v-if="isPending && mode === 'approve' && isLeadApprover"
      :key="`decision-${decisionFormKey}`"
      :submission-id="details.submission.id"
      :courses="details.courses"
      :votes="details.votes"
      :current-user-id="userId"
      @saved="onSaved"
    />

    <CoursesReadonly
      v-if="showReadonlyCourses"
      :courses="details.courses"
    />
  </section>
</template>
