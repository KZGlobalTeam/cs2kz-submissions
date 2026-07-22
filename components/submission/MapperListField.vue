<script setup lang="ts">
import type { MapperInput } from '~/composables/useSubmissionForm'

const props = defineProps<{
  label: string
  modelValue: MapperInput[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MapperInput[]]
}>()

function updateMapper(index: number, key: keyof MapperInput, value: string) {
  const nextValue = props.modelValue.map((mapper, mapperIndex) =>
    mapperIndex === index ? { ...mapper, [key]: value } : mapper,
  )
  emit('update:modelValue', nextValue)
}

function addMapper() {
  emit('update:modelValue', [...props.modelValue, { steamId64: '', displayName: '' }])
}

function removeMapper(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, mapperIndex) => mapperIndex !== index),
  )
}
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold">{{ label }}</h3>
      <UButton
        size="xs"
        variant="outline"
        icon="i-lucide-plus"
        label="Add Mapper"
        @click="addMapper"
      />
    </div>

    <div class="space-y-3">
      <div
        v-for="(mapper, index) in modelValue"
        :key="`${label}-${index}`"
        class="grid items-center gap-3 lg:grid-cols-[1fr_1fr_auto]"
      >
        <UInput
          :model-value="mapper.displayName"
          placeholder="Display name"
          @update:model-value="updateMapper(index, 'displayName', $event)"
        />
        <UInput
          :model-value="mapper.steamId64"
          placeholder="SteamID64"
          @update:model-value="updateMapper(index, 'steamId64', $event)"
        />
        <UButton
          size="xs"
          variant="ghost"
          color="error"
          icon="i-lucide-trash"
          :disabled="modelValue.length === 1"
          @click="removeMapper(index)"
        />
      </div>
    </div>
  </section>
</template>
