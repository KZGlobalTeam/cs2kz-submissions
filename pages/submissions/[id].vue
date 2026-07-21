<script setup lang="ts">
import type { SubmissionDetailResponse } from '~/shared/types/submission-detail'

import ApproverVoteForm from '~/components/review/ApproverVoteForm.vue'
import CoursesReadonly from '~/components/review/CoursesReadonly.vue'
import LeadDecisionPanel from '~/components/review/LeadDecisionPanel.vue'
import MapInfoPanel from '~/components/review/MapInfoPanel.vue'
import ReviewPanelTabs from '~/components/review/ReviewPanelTabs.vue'

type PanelMode = 'vote' | 'approve'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const { session, hasApproverRole, isLeadApprover, refreshSession } = useSession()

const submissionId = computed(() => String(route.params.id))

await callOnce(async () => {
  await refreshSession()
})

const { data: details, refresh } = await useAsyncData<SubmissionDetailResponse>(
  `submission-${submissionId.value}`,
  () => $fetch<SubmissionDetailResponse>(`/api/submissions/${submissionId.value}`),
)

function refreshDetails() {
  return refresh()
}

const userId = computed(() => session.value.user?.id ?? '')

const isPending = computed(() => details.value?.submission.status === 'pending')

const tabs = computed<Array<{ id: PanelMode; label: string }>>(() => {
  const list: Array<{ id: PanelMode; label: string }> = []
  if (hasApproverRole.value) {
    list.push({ id: 'vote', label: 'Vote' })
  }
  if (isLeadApprover.value) {
    list.push({ id: 'approve', label: 'Approve' })
  }
  return list
})

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
  const allowed = tabs.value.map((tab) => tab.id)
  if ((query === 'vote' || query === 'approve') && allowed.includes(query)) {
    return query
  }
  return defaultMode.value
})

const tabMode = computed<PanelMode>({
  get: () => mode.value ?? 'vote',
  set: (value) => {
    void router.replace({ query: { ...route.query, mode: value } })
  },
})

const showReadonlyCourses = computed(
  () => !isPending.value || mode.value === null || tabs.value.length === 0,
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
  await refreshDetails()
}

onMounted(() => {
  const query = route.query.mode
  const allowed = tabs.value.map((tab) => tab.id)
  const valid =
    (query === 'vote' || query === 'approve') && allowed.includes(query)
  if (!valid && defaultMode.value) {
    void router.replace({ query: { ...route.query, mode: defaultMode.value } })
  }
})
</script>

<template>
  <section v-if="details" class="grid gap-6">
    <MapInfoPanel :submission="details.submission" :mappers="details.mappers" />

    <ReviewPanelTabs
      v-if="isPending && tabs.length"
      v-model="tabMode"
      :tabs="tabs"
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
