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
  <div class="space-y-3">
    <div
      v-for="(row, index) in modelValue"
      :key="`${row.courseId}-${row.mode}`"
      class="rounded-lg border border-white/5 bg-black/20 p-4"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-sm font-semibold">
          {{ row.mode === 'classic' ? 'CKZ' : 'VNL' }} Filter
        </p>
        <div class="flex items-center gap-4">
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
      </div>

      <div class="space-y-3">
        <div>
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="text-sm text-muted">Nub Tier</span>
            <OtherApproverVotes
              :votes="votes"
              :current-user-id="currentUserId"
              :course-id="row.courseId"
              :mode="row.mode"
              field="nubTier"
            />
          </div>
          <USelect
            :model-value="String(tierToNumber(row.nubTier))"
            :items="tierOptions"
            value-key="value"
            class="w-32"
            @update:model-value="setNubTier(index, $event)"
          />
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="text-sm text-muted">Pro Tier</span>
            <OtherApproverVotes
              :votes="votes"
              :current-user-id="currentUserId"
              :course-id="row.courseId"
              :mode="row.mode"
              field="proTier"
            />
          </div>
          <USelect
            :model-value="String(tierToNumber(row.proTier))"
            :items="tierOptions"
            value-key="value"
            class="w-32"
            @update:model-value="setProTier(index, $event)"
          />
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <span class="text-sm text-muted">Notes</span>
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
        </div>
      </div>
    </div>
  </div>
</template>
