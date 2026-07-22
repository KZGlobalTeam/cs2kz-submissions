<script setup lang="ts">
import {
  numberToTier,
  tierCount,
  tierToNumber,
} from '~/shared/schemas/cs2kz'
import type { CourseFilterState, CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
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
const decisionStatus = shallowRef<SubmissionStatus>('approved')
const decisionNotes = shallowRef('')
const saving = shallowRef(false)

const tierOptions = Array.from({ length: tierCount }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
}))

const stateOptions = [
  { label: 'Unranked', value: 'unranked' },
  { label: 'Pending', value: 'pending' },
  { label: 'Ranked', value: 'ranked' },
]

const decisionOptions = [
  { label: 'Yes', value: 'approved' },
  { label: 'No', value: 'rejected' },
]

const canSubmit = computed(() => {
  if (saving.value) {
    return false
  }
  if (decisionStatus.value === 'rejected') {
    return decisionNotes.value.trim().length > 0
  }
  return true
})

const courseFilters = computed(() =>
  props.courses.map((course) => ({
    course,
    filters: filters.filter((filter) => filter.courseId === course.id),
  })),
)

function setNubTier(entry: LeadFilter, value: string) {
  entry.nubTier = numberToTier(Number(value))
}

function setProTier(entry: LeadFilter, value: string) {
  entry.proTier = numberToTier(Number(value))
}

async function submitDecision() {
  saving.value = true
  try {
    await $fetch(`/api/submissions/${props.submissionId}/decision`, {
      method: 'PUT',
      body: {
        status: decisionStatus.value,
        decisionNotes:
          decisionStatus.value === 'rejected' ? decisionNotes.value : null,
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
  <UCard>
    <h2 class="mb-4 text-xl font-semibold">Lead Decision</h2>

    <div class="space-y-6">
      <div
        v-for="entry in courseFilters"
        :key="entry.course.id"
        class="rounded-lg border border-white/5 bg-white/3 p-4"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <h3 class="text-lg font-semibold">{{ entry.course.name }}</h3>
          <img :src="entry.course.imageUrl" :alt="entry.course.name" class="h-20 w-36 rounded-md object-cover">
        </div>

        <div
          v-for="filter in entry.filters"
          :key="`${filter.courseId}-${filter.mode}`"
          class="mb-4 rounded-lg border border-white/5 bg-black/20 p-4 last:mb-0"
        >
          <p class="mb-3 text-sm font-semibold">
            {{ filter.mode === 'classic' ? 'CKZ' : 'VNL' }} Filter
          </p>

          <div class="space-y-3">
            <div>
              <div class="mb-1.5 flex items-center justify-between gap-2">
                <span class="text-sm text-muted">Ranked Status</span>
                <OtherApproverVotes
                  :votes="votes"
                  :current-user-id="currentUserId"
                  :course-id="filter.courseId"
                  :mode="filter.mode"
                  field="isRanked"
                />
              </div>
              <URadioGroup
                v-model="filter.state"
                :items="stateOptions"
                value-key="value"
                orientation="horizontal"
              />
            </div>

            <div>
              <div class="mb-1.5 flex items-center justify-between gap-2">
                <span class="text-sm text-muted">Nub Tier</span>
                <OtherApproverVotes
                  :votes="votes"
                  :current-user-id="currentUserId"
                  :course-id="filter.courseId"
                  :mode="filter.mode"
                  field="nubTier"
                />
              </div>
              <USelect
                :model-value="String(tierToNumber(filter.nubTier))"
                :items="tierOptions"
                value-key="value"
                class="w-32"
                @update:model-value="setNubTier(filter, $event)"
              />
            </div>

            <div>
              <div class="mb-1.5 flex items-center justify-between gap-2">
                <span class="text-sm text-muted">Pro Tier</span>
                <OtherApproverVotes
                  :votes="votes"
                  :current-user-id="currentUserId"
                  :course-id="filter.courseId"
                  :mode="filter.mode"
                  field="proTier"
                />
              </div>
              <USelect
                :model-value="String(tierToNumber(filter.proTier))"
                :items="tierOptions"
                value-key="value"
                class="w-32"
                @update:model-value="setProTier(filter, $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-white/5 bg-white/3 p-4">
        <p class="mb-2 text-sm font-semibold">Status of Approval</p>
        <URadioGroup
          v-model="decisionStatus"
          :items="decisionOptions"
          value-key="value"
          orientation="horizontal"
        />

        <div class="mt-3">
          <VoteSummaryPanel :votes="votes" :exclude-user-id="currentUserId" />
        </div>

        <UFormField
          v-if="decisionStatus === 'rejected'"
          label="Reject Reason"
          required
          class="mt-4"
        >
          <UTextarea
            v-model="decisionNotes"
            :rows="3"
            placeholder="Required when rejecting"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex justify-end">
        <UButton
          label="Submit Approval"
          :loading="saving"
          :disabled="!canSubmit"
          @click="submitDecision"
        />
      </div>
    </div>
  </UCard>
</template>
