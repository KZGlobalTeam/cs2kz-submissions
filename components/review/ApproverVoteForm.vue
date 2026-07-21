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
        rejectionReason: form.rejectionReason || null,
        rejectionExplanation: form.rejectionExplanation || null,
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
  <section class="panel rounded-[1.5rem] p-5">
    <div class="mb-5">
      <h2 class="text-xl font-semibold">Approver Vote</h2>
      <p class="mt-2 text-sm text-muted">对地图整体给出 Yes/No，并对每个 course 的 CKZ/VNL filter 进行标注。</p>
    </div>

    <div class="grid gap-4">
      <VoteSummaryPanel :votes="votes" :exclude-user-id="currentUserId" />

      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <label class="field-label">Status of Approval</label>
          <select v-model="form.approvalDecision" class="field-input">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div v-if="form.approvalDecision === 'no'">
          <label class="field-label">Rejection Reason</label>
          <input v-model="form.rejectionReason" class="field-input" placeholder="Reason">
        </div>
      </div>

      <div v-if="form.approvalDecision === 'no'">
        <label class="field-label">Explanation</label>
        <textarea v-model="form.rejectionExplanation" class="field-input min-h-24" placeholder="Explain why the map should not be approved" />
      </div>

      <div
        v-for="entry in courseFilters"
        :key="entry.course.id"
        class="rounded-[1.5rem] border border-white/5 bg-white/5 p-4"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <h3 class="text-lg font-semibold">{{ entry.course.name }}</h3>
          <img :src="entry.course.imageUrl" :alt="entry.course.name" class="h-28 w-52 rounded-2xl object-cover">
        </div>

        <CourseFilterVoteTable
          :model-value="entry.filters"
          :votes="votes"
          :current-user-id="currentUserId"
          @update:model-value="updateCourseFilters(entry.course.id, $event)"
        />
      </div>

      <div class="flex justify-end">
        <button class="primary-button" type="button" :disabled="saving" @click="submitVote">
          {{ saving ? 'Saving...' : 'Save Vote' }}
        </button>
      </div>
    </div>
  </section>
</template>
