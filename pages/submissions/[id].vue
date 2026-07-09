<script setup lang="ts">
import ApproverVoteForm from '~/components/review/ApproverVoteForm.vue'
import LeadDecisionPanel from '~/components/review/LeadDecisionPanel.vue'
import VoteSummaryPanel from '~/components/review/VoteSummaryPanel.vue'

interface DetailMapper {
  displayNameSnapshot: string
}

interface DetailCourse {
  id: string
  name: string
  imageUrl: string
  mappers: DetailMapper[]
}

interface DetailVote {
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
}

interface SubmissionDetail {
  submission: {
    id: string
    mapName: string
    notes: string | null
    workshopUrl: string
    status: string
  }
  mappers: DetailMapper[]
  courses: DetailCourse[]
  votes: DetailVote[]
}

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const { isApprover, isLeadApprover, refreshSession } = useSession()
const submissionId = computed(() => String(route.params.id))
const submissionPath = computed(() => `/api/submissions/${submissionId.value}` as string)

await callOnce(async () => {
  await refreshSession()
})

const { data: details, refresh } = await useAsyncData<SubmissionDetail>(
  `submission-${submissionId.value}`,
  () => $fetch<SubmissionDetail>(submissionPath.value),
)

function refreshDetails() {
  return refresh()
}
</script>

<template>
  <div v-if="details" class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
    <section class="grid gap-6">
      <div class="panel rounded-[1.5rem] p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-muted">Submission Detail</p>
            <h1 class="mt-3 text-3xl font-semibold">{{ details.submission.mapName }}</h1>
            <p class="mt-3 text-sm text-zinc-300">{{ details.submission.notes || 'No notes' }}</p>
          </div>
          <button class="secondary-button text-xs" type="button" @click="refreshDetails">
            Refresh
          </button>
        </div>

        <div class="mt-6 space-y-3 text-sm text-zinc-300">
          <p>Workshop URL: {{ details.submission.workshopUrl }}</p>
          <p>Status: {{ details.submission.status }}</p>
          <p>Mappers: {{ details.mappers.map((mapper) => mapper.displayNameSnapshot).join(', ') }}</p>
        </div>
      </div>

      <div class="panel rounded-[1.5rem] p-5">
        <h2 class="text-xl font-semibold">Courses</h2>
        <div class="mt-4 space-y-4">
          <div
            v-for="course in details.courses"
            :key="course.id"
            class="rounded-[1.25rem] border border-white/5 bg-white/5 p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold">{{ course.name }}</h3>
                <p class="mt-2 text-sm text-muted">
                  Mappers: {{ course.mappers.map((mapper) => mapper.displayNameSnapshot).join(', ') }}
                </p>
              </div>
              <img :src="course.imageUrl" :alt="course.name" class="h-28 w-52 rounded-2xl object-cover">
            </div>
          </div>
        </div>
      </div>

      <VoteSummaryPanel :votes="details.votes" />
    </section>

    <section class="grid gap-6">
      <ApproverVoteForm
        v-if="isApprover"
        :submission-id="details.submission.id"
        :courses="details.courses.map((course) => ({ id: course.id, name: course.name }))"
      />

      <LeadDecisionPanel
        v-if="isLeadApprover"
        :submission-id="details.submission.id"
        :courses="details.courses.map((course) => ({ id: course.id, name: course.name }))"
      />
    </section>
  </div>
</template>
