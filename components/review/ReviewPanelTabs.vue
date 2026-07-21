<script setup lang="ts">
type PanelMode = 'vote' | 'approve'

defineProps<{
  tabs: Array<{ id: PanelMode; label: string }>
}>()

const model = defineModel<PanelMode>({ required: true })
</script>

<template>
  <div class="flex gap-2">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="text-sm"
      :class="model === tab.id ? 'primary-button' : 'secondary-button'"
      @click="model = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
