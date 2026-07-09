<script setup lang="ts">
const tierOptions = [
  'very-easy',
  'easy',
  'medium',
  'advanced',
  'hard',
  'very-hard',
  'extreme',
  'death',
  'unfeasible',
  'impossible',
 ] as const

type Tier = (typeof tierOptions)[number]

interface FilterRow {
  courseId: string
  mode: 'classic' | 'vanilla'
  nubTier: Tier
  proTier: Tier
  isRanked: boolean
  notes: string
}

const props = defineProps<{
  modelValue: FilterRow[]
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
        <label class="flex items-center gap-2 text-sm text-zinc-300">
          <input
            :checked="row.isRanked"
            type="checkbox"
            @change="updateRow(index, { isRanked: ($event.target as HTMLInputElement).checked })"
          >
          Ranked
        </label>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <label class="field-label">Nub Tier</label>
          <select
            class="field-input"
            :value="row.nubTier"
            @change="updateRow(index, { nubTier: ($event.target as HTMLSelectElement).value as Tier })"
          >
            <option v-for="tier in tierOptions" :key="tier" :value="tier">{{ tier }}</option>
          </select>
        </div>

        <div>
          <label class="field-label">Pro Tier</label>
          <select
            class="field-input"
            :value="row.proTier"
            @change="updateRow(index, { proTier: ($event.target as HTMLSelectElement).value as Tier })"
          >
            <option v-for="tier in tierOptions" :key="tier" :value="tier">{{ tier }}</option>
          </select>
        </div>
      </div>

      <div class="mt-4">
        <label class="field-label">Notes</label>
        <textarea
          class="field-input min-h-24"
          :value="row.notes"
          @input="updateRow(index, { notes: ($event.target as HTMLTextAreaElement).value })"
        />
      </div>
    </div>
  </div>
</template>
