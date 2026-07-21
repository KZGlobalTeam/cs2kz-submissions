<script setup lang="ts">
import { courseFilterTierValues } from '~/shared/schemas/cs2kz'
import type { CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

import OtherApproverVotes from './OtherApproverVotes.vue'

type Tier = CourseFilterTier

interface FilterRow {
  courseId: string
  mode: Mode
  nubTier: Tier
  proTier: Tier
  isRanked: boolean
  notes: string
}

const props = defineProps<{
  modelValue: FilterRow[]
  votes: SubmissionDetailVote[]
  currentUserId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterRow[]]
}>()

function updateRow(index: number, patch: Partial<FilterRow>) {
  emit(
    'update:modelValue',
    props.modelValue.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    ),
  )
}

// Extract values in script so templates stay free of TS `as` casts.
function tierFromEvent(event: Event): Tier {
  return (event.target as HTMLSelectElement).value as Tier
}

function checkedFromEvent(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function textFromEvent(event: Event): string {
  return (event.target as HTMLTextAreaElement).value
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(row, index) in modelValue"
      :key="`${row.courseId}-${row.mode}`"
      class="rounded-3xl border border-white/5 bg-black/20 p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm font-semibold">
          {{ row.mode === 'classic' ? 'CKZ' : 'VNL' }} Filter
        </p>
        <div class="flex items-center gap-3">
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="isRanked"
          />
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input
              :checked="row.isRanked"
              type="checkbox"
              @change="updateRow(index, { isRanked: checkedFromEvent($event) })"
            >
            Ranked
          </label>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm text-muted">Nub Tier</span>
            <OtherApproverVotes
              :votes="votes"
              :current-user-id="currentUserId"
              :course-id="row.courseId"
              :mode="row.mode"
              field="nubTier"
            />
          </div>
          <select
            class="field-input"
            :value="row.nubTier"
            @change="updateRow(index, { nubTier: tierFromEvent($event) })"
          >
            <option v-for="tier in courseFilterTierValues" :key="tier" :value="tier">{{ tier }}</option>
          </select>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm text-muted">Pro Tier</span>
            <OtherApproverVotes
              :votes="votes"
              :current-user-id="currentUserId"
              :course-id="row.courseId"
              :mode="row.mode"
              field="proTier"
            />
          </div>
          <select
            class="field-input"
            :value="row.proTier"
            @change="updateRow(index, { proTier: tierFromEvent($event) })"
          >
            <option v-for="tier in courseFilterTierValues" :key="tier" :value="tier">{{ tier }}</option>
          </select>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-muted">Notes</span>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="notes"
          />
        </div>
        <textarea
          class="field-input min-h-24"
          :value="row.notes"
          @input="updateRow(index, { notes: textFromEvent($event) })"
        />
      </div>
    </div>
  </div>
</template>
