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
  enabled: boolean
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

function setEnabled(index: number, value: boolean) {
  updateRow(index, { enabled: value })
}
</script>

<template>
  <div class="space-y-6">
    <div
      v-for="(row, index) in modelValue"
      :key="`${row.courseId}-${row.mode}`"
      class="border-t border-white/5 pt-6 first:border-t-0 first:pt-0"
    >
      <div class="mb-4 flex items-center gap-3">
        <p class="text-base font-semibold">
          {{ row.mode === 'classic' ? 'CKZ' : 'VNL' }} Filter
        </p>
        <UCheckbox
          :model-value="row.enabled"
          label="Vote on this filter"
          @update:model-value="setEnabled(index, $event === true)"
        />
      </div>

      <div v-if="row.enabled" class="space-y-3">
        <div>
          <div class="flex items-center gap-4">
            <span class="w-28 shrink-0 text-sm text-muted">Ranked Status</span>
            <URadioGroup
              :model-value="row.isRanked ? 'true' : 'false'"
              :items="rankedOptions"
              value-key="value"
              orientation="horizontal"
              @update:model-value="setRanked(index, $event)"
            />
          </div>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="isRanked"
            class="mt-2"
          />
        </div>

        <div>
          <div class="flex items-center gap-4">
            <span class="w-28 shrink-0 text-sm text-muted">NUB Tier</span>
            <USelect
              :model-value="String(tierToNumber(row.nubTier))"
              :items="tierOptions"
              value-key="value"
              class="w-32"
              @update:model-value="setNubTier(index, $event)"
            />
          </div>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="nubTier"
            class="mt-2"
          />
        </div>

        <div>
          <div class="flex items-center gap-4">
            <span class="w-28 shrink-0 text-sm text-muted">PRO Tier</span>
            <USelect
              :model-value="String(tierToNumber(row.proTier))"
              :items="tierOptions"
              value-key="value"
              class="w-32"
              @update:model-value="setProTier(index, $event)"
            />
          </div>
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="proTier"
            class="mt-2"
          />
        </div>

        <UFormField label="Reasoning for Tier" required class="w-full">
          <UTextarea
            :model-value="row.notes"
            :rows="2"
            class="w-full"
            @update:model-value="updateRow(index, { notes: $event })"
          />
          <OtherApproverVotes
            :votes="votes"
            :current-user-id="currentUserId"
            :course-id="row.courseId"
            :mode="row.mode"
            field="notes"
            orientation="vertical"
            class="mt-2"
          />
        </UFormField>
      </div>
    </div>
  </div>
</template>
