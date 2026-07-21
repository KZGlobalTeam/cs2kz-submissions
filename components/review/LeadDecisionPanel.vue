<script setup lang="ts">
import type { CourseFilterState, CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
import { courseFilterStateValues, courseFilterTierValues } from '~/shared/schemas/cs2kz'
import type { SubmissionStatus } from '~/shared/types/submission'
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

import OtherApproverVotes from './OtherApproverVotes.vue'
import VoteSummaryPanel from './VoteSummaryPanel.vue'

interface CourseInput {
  id: string
  name: string
  imageUrl: string
}

interface LeadFilter {
  courseId: string
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  state: CourseFilterState
}

const props = defineProps<{
  submissionId: string
  courses: CourseInput[]
  votes: SubmissionDetailVote[]
  currentUserId: string
}>()

const emit = defineEmits<{ saved: [] }>()

const FILTER_MODES: Mode[] = ['classic', 'vanilla']

function seedLeadFilters(courses: CourseInput[]): LeadFilter[] {
  return courses.flatMap((course) =>
    FILTER_MODES.map((mode) => ({
      courseId: course.id,
      mode,
      nubTier: 'medium' as CourseFilterTier,
      proTier: 'medium' as CourseFilterTier,
      state: 'ranked' as CourseFilterState,
    })),
  )
}

const filters = reactive(seedLeadFilters(props.courses))
const decisionNotes = shallowRef('')
const saving = shallowRef(false)

const canReject = computed(() => decisionNotes.value.trim().length > 0)

const courseFilters = computed(() =>
  props.courses.map((course) => ({
    course,
    filters: filters.filter((filter) => filter.courseId === course.id),
  })),
)

async function submitDecision(status: SubmissionStatus) {
  saving.value = true
  try {
    await $fetch(`/api/submissions/${props.submissionId}/decision`, {
      method: 'PUT',
      body: {
        status,
        decisionNotes: decisionNotes.value || null,
        filters: filters.map((filter) => ({
          courseId: filter.courseId,
          mode: filter.mode,
          nubTier: filter.nubTier,
          proTier: filter.proTier,
          state: filter.state,
          isRanked: filter.state === 'ranked',
          notes: null,
        })),
      },
    })
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="panel rounded-[1.5rem] p-5">
    <div class="mb-4">
      <h2 class="text-xl font-semibold">Lead Decision</h2>
      <p class="mt-2 text-sm text-muted">Lead approver 汇总所有 votes 后做最终 approved / rejected 决策。</p>
    </div>

    <div class="grid gap-4">
      <VoteSummaryPanel :votes="votes" :exclude-user-id="currentUserId" />

      <div>
        <label class="field-label">Reject Reason</label>
        <input v-model="decisionNotes" class="field-input" placeholder="必填（仅 Reject 时）">
      </div>

      <div
        v-for="entry in courseFilters"
        :key="entry.course.id"
        class="rounded-[1.25rem] border border-white/5 bg-white/5 p-4"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <h3 class="text-lg font-semibold">{{ entry.course.name }}</h3>
          <img :src="entry.course.imageUrl" :alt="entry.course.name" class="h-28 w-52 rounded-2xl object-cover">
        </div>

        <div
          v-for="filter in entry.filters"
          :key="`${filter.courseId}-${filter.mode}`"
          class="mb-4 rounded-2xl border border-white/5 bg-black/20 p-4 last:mb-0"
        >
          <p class="mb-3 text-sm font-semibold">
            {{ filter.mode === 'classic' ? 'CKZ' : 'VNL' }} Filter
          </p>

          <div class="grid gap-4 lg:grid-cols-3">
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm text-muted">Ranked Status</span>
                <OtherApproverVotes
                  :votes="votes"
                  :current-user-id="currentUserId"
                  :course-id="filter.courseId"
                  :mode="filter.mode"
                  field="isRanked"
                />
              </div>
              <select v-model="filter.state" class="field-input">
                <option v-for="value in courseFilterStateValues" :key="value" :value="value">{{ value }}</option>
              </select>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm text-muted">Nub Tier</span>
                <OtherApproverVotes
                  :votes="votes"
                  :current-user-id="currentUserId"
                  :course-id="filter.courseId"
                  :mode="filter.mode"
                  field="nubTier"
                />
              </div>
              <select v-model="filter.nubTier" class="field-input">
                <option v-for="value in courseFilterTierValues" :key="value" :value="value">{{ value }}</option>
              </select>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm text-muted">Pro Tier</span>
                <OtherApproverVotes
                  :votes="votes"
                  :current-user-id="currentUserId"
                  :course-id="filter.courseId"
                  :mode="filter.mode"
                  field="proTier"
                />
              </div>
              <select v-model="filter.proTier" class="field-input">
                <option v-for="value in courseFilterTierValues" :key="value" :value="value">{{ value }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          class="secondary-button"
          type="button"
          :disabled="saving"
          @click="submitDecision('approved')"
        >
          {{ saving ? 'Saving...' : 'Approve' }}
        </button>
        <button
          class="primary-button"
          type="button"
          :disabled="saving || !canReject"
          @click="submitDecision('rejected')"
        >
          Reject
        </button>
      </div>
    </div>
  </section>
</template>
