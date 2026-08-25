<script setup lang="ts">
import type { VoteFormFilter } from '~/composables/useVoteForm'
import type { RejectionAttachment } from '~/shared/types/attachment'
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

import CourseFilterVoteTable from './CourseFilterVoteTable.vue'
import VoteSummaryPanel from './VoteSummaryPanel.vue'
import RejectionAttachmentStage from '../common/RejectionAttachmentStage.vue'

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
const toast = useToast()
const validationError = ref<string | null>(null)

/** The attachments already saved on our previous vote — the stage keeps those
 *  when the decision toggles away from rejection and restores them on return. */
const storedAttachments: RejectionAttachment[] = selfVote?.attachments ?? []

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

function validateForm(): string | null {
  for (const filter of form.filters) {
    if (!filter.enabled) {
      continue
    }
    if (!filter.notes.trim()) {
      return 'Reasoning for Tier is required for every enabled filter.'
    }
  }

  if (form.approvalDecision === 'no' && !form.rejectionReason.trim()) {
    return 'Reason for rejection is required when Status of Approval is No.'
  }

  return null
}

async function submitVote() {
  const error = validateForm()
  if (error) {
    validationError.value = error
    toast.add({
      color: 'error',
      title: 'Validation error',
      description: error,
    })
    return
  }

  validationError.value = null
  saving.value = true
  try {
    await $fetch(`/api/submissions/${props.submissionId}/vote`, {
      method: 'PUT',
      body: {
        approvalDecision: form.approvalDecision,
        rejectionReason: form.approvalDecision === 'no' ? (form.rejectionReason || null) : null,
        attachments: form.approvalDecision === 'no' ? form.attachments : [],
        filters: form.filters
          .filter((filter) => filter.enabled)
          .map((filter) => ({
            courseId: filter.courseId,
            mode: filter.mode,
            nubTier: filter.nubTier,
            proTier: filter.proTier,
            isRanked: filter.isRanked,
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
  <div class="space-y-6">
    <UCard
      v-for="entry in courseFilters"
      :key="entry.course.id"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <h3 class="mb-4 text-xl font-semibold">{{ entry.course.name }}</h3>
      <img
        :src="entry.course.imageUrl"
        :alt="entry.course.name"
        class="h-40 w-auto max-w-full rounded-md object-contain"
      >

      <div class="mt-6 border-t border-white/5 pt-6">
        <CourseFilterVoteTable
          :model-value="entry.filters"
          :votes="votes"
          :current-user-id="currentUserId"
          @update:model-value="updateCourseFilters(entry.course.id, $event)"
        />
      </div>
    </UCard>

    <UCard :ui="{ body: 'p-4 sm:p-4' }">
      <p class="mb-2 text-xl font-semibold">Status of Approval:</p>
      <URadioGroup
        v-model="form.approvalDecision"
        :items="decisionOptions"
        value-key="value"
        orientation="horizontal"
      />

      <div class="mt-3">
        <VoteSummaryPanel :votes="votes" :exclude-user-id="currentUserId" />
      </div>

      <div v-show="form.approvalDecision === 'no'" class="mt-4 space-y-3">
        <UFormField label="Reason for Rejection:" required>
          <UInput v-model="form.rejectionReason" placeholder="Reason" class="w-full" />
          <RejectionAttachmentStage
            v-model="form.attachments"
            :stored="storedAttachments"
            :active="form.approvalDecision === 'no'"
          />
        </UFormField>
      </div>
    </UCard>

    <div class="flex flex-col items-end gap-2">
      <p v-if="validationError" class="text-sm text-error">{{ validationError }}</p>
      <UButton
        label="Save Vote"
        :loading="saving"
        @click="submitVote"
      />
    </div>
  </div>
</template>
