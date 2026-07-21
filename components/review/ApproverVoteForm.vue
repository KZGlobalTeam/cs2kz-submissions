<script setup lang="ts">
import type { VoteFormFilter } from '~/composables/useVoteForm'
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

import CourseFilterVoteTable from './CourseFilterVoteTable.vue'
import VoteSummaryPanel from './VoteSummaryPanel.vue'

interface CourseInput {
  id: string
  name: string
  imageUrl: string
}

const props = defineProps<{
  submissionId: string
  courses: CourseInput[]
  votes: SubmissionDetailVote[]
  currentUserId: string
}>()

const emit = defineEmits<{ saved: [] }>()

const selfVote = props.votes.find(
  (vote) => vote.approverUserId === props.currentUserId,
)
const { form } = useVoteForm(props.courses, selfVote)
const saving = shallowRef(false)

const decisionOptions = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
]

const courseFilters = computed(() =>
  props.courses.map((course) => ({
    course,
    filters: form.filters.filter((filter) => filter.courseId === course.id),
  })),
)

function updateCourseFilters(courseId: string, rows: VoteFormFilter[]) {
  form.filters = [
    ...form.filters.filter((filter) => filter.courseId !== courseId),
    ...rows,
  ]
}

async function submitVote() {
  saving.value = true
  try {
    await $fetch(`/api/submissions/${props.submissionId}/vote`, {
      method: 'PUT',
      body: {
        approvalDecision: form.approvalDecision,
        rejectionReason: form.approvalDecision === 'no' ? (form.rejectionReason || null) : null,
        rejectionExplanation: form.approvalDecision === 'no' ? (form.rejectionExplanation || null) : null,
        filters: form.filters.map((filter) => ({
          ...filter,
          notes: filter.notes || null,
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
    <h2 class="mb-4 text-xl font-semibold">Approver Vote</h2>

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

        <CourseFilterVoteTable
          :model-value="entry.filters"
          :votes="votes"
          :current-user-id="currentUserId"
          @update:model-value="updateCourseFilters(entry.course.id, $event)"
        />
      </div>

      <div class="rounded-lg border border-white/5 bg-white/3 p-4">
        <p class="mb-2 text-sm font-semibold">Status of Approval</p>
        <URadioGroup
          v-model="form.approvalDecision"
          :items="decisionOptions"
          value-key="value"
          orientation="horizontal"
        />

        <div class="mt-3">
          <VoteSummaryPanel :votes="votes" :exclude-user-id="currentUserId" />
        </div>

        <div v-if="form.approvalDecision === 'no'" class="mt-4 space-y-3">
          <UFormField label="Rejection Reason" required>
            <UInput v-model="form.rejectionReason" placeholder="Reason" class="w-full" />
          </UFormField>
          <UFormField label="Explanation">
            <UTextarea
              v-model="form.rejectionExplanation"
              :rows="3"
              placeholder="Explain why the map should not be approved"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <div class="flex justify-end">
        <UButton
          label="Save Vote"
          icon="i-lucide-save"
          :loading="saving"
          @click="submitVote"
        />
      </div>
    </div>
  </UCard>
</template>
