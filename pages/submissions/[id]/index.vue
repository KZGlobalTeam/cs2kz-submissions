<script setup lang="ts">
import type { SubmissionDetailResponse } from '~/shared/types/submission-detail'

import ApproverChecklistReadonly from '~/components/review/ApproverChecklistReadonly.vue'
import ApproverChecklistSection from '~/components/review/ApproverChecklistSection.vue'
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

/** The page is both the review surface (vote/approve panels) and the
 *  submission details page. The review-mode default below is role-based and
 *  must never apply to the submission's creator: an approver who made a
 *  submission lands here from "My Submissions" → Details expecting the
 *  details view, not their own review panel. An explicit `?mode=vote` /
 *  `?mode=approve` (the review table's Vote/Approve buttons) still wins in
 *  the `mode` computed, so reviewing your own row deliberately stays
 *  possible. */
const isOwner = computed(
  () => details.value?.submission.createdByUserId === userId.value,
)

/** True while the read-only checklist card has something to show (any tick
 *  set or a non-empty note saved to the viewer's browser). The page renders
 *  the two-column layout only then, so a never-saved approver gets no empty
 *  side column after review. */
const readonlyChecklistVisible = shallowRef(false)

const defaultMode = computed<PanelMode | null>(() => {
  if (isOwner.value) {
    return null
  }
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

// Persist the resolved review mode in the URL (a refresh re-enters the same
// panel) — but only for reviewers of *others'* submissions, and only once the
// detail payload has resolved. Ownership is unknown at mount (the fetch is
// client-side), so injecting on mount would tag the creator's plain Details
// navigation with `?mode=` before `isOwner` is true, and the query branch of
// the `mode` computed would then keep the review panel pinned. The payload
// response is the seam: it's the moment `isOwner` becomes known.
watch(details, () => {
  if (isOwner.value || !defaultMode.value) {
    return
  }
  const query = route.query.mode
  if (
    !((query === 'vote' && hasApproverRole.value) ||
       (query === 'approve' && isLeadApprover.value))
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

    <div
      v-if="isPending && mode === 'vote' && hasApproverRole"
      class="grid gap-6 lg:grid-cols-2"
    >
      <ApproverVoteForm
        :key="`vote-${voteFormKey}`"
        :submission-id="details.submission.id"
        :courses="details.courses"
        :votes="details.votes"
        :current-user-id="userId"
        @saved="onSaved"
      />

      <!-- Sticky card: the wrapper (grid item) stretches to the vote
           column's height, so the card pins at the top while scrolling. -->
      <div>
        <ApproverChecklistSection
          :user-id="userId"
          :submission-id="details.submission.id"
          :is-port="details.submission.isPort"
          class="lg:sticky lg:top-6"
        />
      </div>
    </div>

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
      v-if="showReadonlyCourses && !(!isPending && hasApproverRole)"
      :courses="details.courses"
    />

    <!-- Once the submission has left review, an approver sees their saved
         checklist and note read-only, in the same side-column spot the
         editable card occupied during review: two columns on desktop,
         stacked on mobile. The second column is collapsible and the grid
         falls back to one column when the approver never saved anything —
         never an empty box. Same porting rule as the editable section: the
         porting group renders only when the submission is a port. A user who
         holds `approver` (lead or not) reaches this branch with their own
         private checklist; lead-only users and mappers never do. -->
    <div
      v-else-if="!isPending && hasApproverRole"
      class="grid gap-6"
      :class="{ 'lg:grid-cols-2': readonlyChecklistVisible }"
    >
      <CoursesReadonly :courses="details.courses" />

      <div v-show="readonlyChecklistVisible">
        <ApproverChecklistReadonly
          :user-id="userId"
          :submission-id="details.submission.id"
          :is-port="details.submission.isPort"
          class="lg:sticky lg:top-6"
          @loaded="readonlyChecklistVisible = $event"
        />
      </div>
    </div>
  </section>
</template>
