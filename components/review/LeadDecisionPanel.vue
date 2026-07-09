<script setup lang="ts">
const props = defineProps<{
  submissionId: string
  courses: Array<{ id: string; name: string }>
}>()

const saving = shallowRef(false)
const decisionStatus = shallowRef<'approved' | 'rejected'>('approved')
const decisionNotes = shallowRef('')
const filters = shallowRef(
  props.courses.flatMap((course) => [
    {
      courseId: course.id,
      mode: 'classic' as const,
      nubTier: 'medium',
      proTier: 'medium',
      state: 'ranked' as const,
      isRanked: true,
      notes: '',
    },
    {
      courseId: course.id,
      mode: 'vanilla' as const,
      nubTier: 'medium',
      proTier: 'medium',
      state: 'ranked' as const,
      isRanked: true,
      notes: '',
    },
  ]),
)

async function submitDecision() {
  saving.value = true
  try {
    await $fetch(`/api/submissions/${props.submissionId}/decision`, {
      method: 'PUT',
      body: {
        status: decisionStatus.value,
        decisionNotes: decisionNotes.value || null,
        filters: filters.value.map((filter) => ({
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
    <div class="mb-4">
      <h2 class="text-xl font-semibold">Lead Decision</h2>
      <p class="mt-2 text-sm text-muted">Lead approver 汇总所有 votes 后做最终 approved / rejected 决策。</p>
    </div>

    <div class="grid gap-4">
      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <label class="field-label">Final Status</label>
          <select v-model="decisionStatus" class="field-input">
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label class="field-label">Decision Notes</label>
          <input v-model="decisionNotes" class="field-input" placeholder="Decision notes" />
        </div>
      </div>

      <div
        v-for="course in courses"
        :key="course.id"
        class="rounded-[1.25rem] border border-white/5 bg-white/5 p-4"
      >
        <h3 class="mb-4 text-lg font-semibold">{{ course.name }}</h3>
        <div
          v-for="filter in filters.filter((item) => item.courseId === course.id)"
          :key="`${filter.courseId}-${filter.mode}`"
          class="mb-4 rounded-2xl border border-white/5 bg-black/20 p-4"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="font-medium">{{ filter.mode === 'classic' ? 'CKZ' : 'VNL' }}</span>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="filter.isRanked" type="checkbox">
              Ranked
            </label>
          </div>

          <div class="grid gap-4 lg:grid-cols-3">
            <select v-model="filter.nubTier" class="field-input">
              <option value="very-easy">very-easy</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="advanced">advanced</option>
              <option value="hard">hard</option>
              <option value="very-hard">very-hard</option>
              <option value="extreme">extreme</option>
              <option value="death">death</option>
              <option value="unfeasible">unfeasible</option>
              <option value="impossible">impossible</option>
            </select>
            <select v-model="filter.proTier" class="field-input">
              <option value="very-easy">very-easy</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="advanced">advanced</option>
              <option value="hard">hard</option>
              <option value="very-hard">very-hard</option>
              <option value="extreme">extreme</option>
              <option value="death">death</option>
              <option value="unfeasible">unfeasible</option>
              <option value="impossible">impossible</option>
            </select>
            <select v-model="filter.state" class="field-input">
              <option value="ranked">ranked</option>
              <option value="unranked">unranked</option>
              <option value="pending">pending</option>
            </select>
          </div>

          <textarea v-model="filter.notes" class="field-input mt-4 min-h-20" placeholder="Notes" />
        </div>
      </div>

      <div class="flex justify-end">
        <button class="primary-button" type="button" :disabled="saving" @click="submitDecision">
          {{ saving ? 'Saving...' : 'Save Decision' }}
        </button>
      </div>
    </div>
  </section>
</template>
