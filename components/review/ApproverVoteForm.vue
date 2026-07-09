<script setup lang="ts">
import CourseFilterVoteTable from './CourseFilterVoteTable.vue'

const props = defineProps<{
  submissionId: string
  courses: Array<{ id: string; name: string }>
}>()

const { form } = useVoteForm()
const saving = shallowRef(false)

watchEffect(() => {
  if (form.filters.length) {
    return
  }

  form.filters = props.courses.flatMap((course) => [
    {
      courseId: course.id,
      mode: 'classic' as const,
      nubTier: 'medium',
      proTier: 'medium',
      isRanked: true,
      notes: '',
    },
    {
      courseId: course.id,
      mode: 'vanilla' as const,
      nubTier: 'medium',
      proTier: 'medium',
      isRanked: true,
      notes: '',
    },
  ])
})

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
          <input v-model="form.rejectionReason" class="field-input" placeholder="Reason" />
        </div>
      </div>

      <div v-if="form.approvalDecision === 'no'">
        <label class="field-label">Explanation</label>
        <textarea v-model="form.rejectionExplanation" class="field-input min-h-24" placeholder="Explain why the map should not be approved" />
      </div>

      <div
        v-for="course in courses"
        :key="course.id"
        class="rounded-[1.5rem] border border-white/5 bg-white/5 p-4"
      >
        <div class="mb-4">
          <h3 class="text-lg font-semibold">{{ course.name }}</h3>
        </div>

        <CourseFilterVoteTable
          :model-value="form.filters.filter((item) => item.courseId === course.id)"
          @update:model-value="
            form.filters = [
              ...form.filters.filter((item) => item.courseId !== course.id),
              ...$event,
            ]
          "
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
