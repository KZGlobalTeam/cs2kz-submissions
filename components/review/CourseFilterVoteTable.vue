<script setup lang="ts">
import {
  numberToTier,
  tierCount,
  tierToNumber,
} from '~/shared/schemas/cs2kz'
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

const tierOptions = Array.from({ length: tierCount }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
}))

const rankedOptions = [
  { label: 'Ranked', value: 'true' },
  { label: 'Unranked', value: 'false' },
]

function updateRow(index: number, patch: Partial<FilterRow>) {
  emit(
    'update:modelValue',
    props.modelValue.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    ),
  )
}

function setNubTier(index: number, value: string) {
  updateRow(index, { nubTier: numberToTier(Number(value)) })
}

function setProTier(index: number, value: string) {
  updateRow(index, { proTier: numberToTier(Number(value)) })
}

function setRanked(index: number, value: string) {
  updateRow(index, { isRanked: value === 'true' })
}
</script>

<template>
  <div class="space-y-5">
    <div
      v-for="(row, index) in modelValue"
      :key="`${row.courseId}-${row.mode}`"
    >
      <p class="mb-3 text-sm font-semibold">
        {{ row.mode === 'classic' ? 'CKZ' : 'VNL' }} Filter
      </p>

      <div class="space-y-3">
        <div class="flex items-center gap-4">
          <span class="w-28 shrink-0 text-sm text-muted">Ranked Status</span>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="isRanked"
          />
          <URadioGroup
            :model-value="row.isRanked ? 'true' : 'false'"
            :items="rankedOptions"
            value-key="value"
            orientation="horizontal"
            @update:model-value="setRanked(index, $event)"
          />
        </div>

        <div class="flex items-center gap-4">
          <span class="w-28 shrink-0 text-sm text-muted">Nub Tier</span>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="nubTier"
          />
          <USelect
            :model-value="String(tierToNumber(row.nubTier))"
            :items="tierOptions"
            value-key="value"
            class="w-32"
            @update:model-value="setNubTier(index, $event)"
          />
        </div>

        <div class="flex items-center gap-4">
          <span class="w-28 shrink-0 text-sm text-muted">Pro Tier</span>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="proTier"
          />
          <USelect
            :model-value="String(tierToNumber(row.proTier))"
            :items="tierOptions"
            value-key="value"
            class="w-32"
            @update:model-value="setProTier(index, $event)"
          />
        </div>

        <UFormField label="Reasoning of Tier" required class="w-full">
          <div class="mb-1.5 flex items-center gap-2">
            <OtherApproverVotes
              :votes="votes"
              :current-user-id="currentUserId"
              :course-id="row.courseId"
              :mode="row.mode"
              field="notes"
            />
          </div>
          <UTextarea
            :model-value="row.notes"
            :rows="2"
            class="w-full"
            @update:model-value="updateRow(index, { notes: $event })"
          />
        </UFormField>
      </div>
    </div>
  </div>
</template>
