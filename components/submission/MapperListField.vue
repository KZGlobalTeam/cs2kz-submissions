<script setup lang="ts">
interface MapperInput {
  steamId64: string
  steamId: string
  displayName: string
}

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
  emit('update:modelValue', [
    ...props.modelValue,
    { steamId64: '', steamId: '', displayName: '' },
  ])
}

function removeMapper(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, mapperIndex) => mapperIndex !== index),
  )
}
</script>

<template>
  <section class="rounded-3xl border border-white/5 bg-white/5 p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold">{{ label }}</h3>
      <button class="secondary-button text-xs" type="button" @click="addMapper">
        Add Mapper
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="(mapper, index) in modelValue"
        :key="`${label}-${index}`"
        class="grid gap-3 rounded-2xl border border-white/5 bg-black/20 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input
          :value="mapper.displayName"
          class="field-input"
          placeholder="Display name"
          @input="updateMapper(index, 'displayName', ($event.target as HTMLInputElement).value)"
        >
        <input
          :value="mapper.steamId64"
          class="field-input"
          placeholder="SteamID64"
          @input="updateMapper(index, 'steamId64', ($event.target as HTMLInputElement).value)"
        >
        <input
          :value="mapper.steamId"
          class="field-input"
          placeholder="STEAM_1:..."
          @input="updateMapper(index, 'steamId', ($event.target as HTMLInputElement).value)"
        >
        <button
          class="secondary-button text-xs"
          type="button"
          :disabled="modelValue.length === 1"
          @click="removeMapper(index)"
        >
          Remove
        </button>
      </div>
    </div>
  </section>
</template>
