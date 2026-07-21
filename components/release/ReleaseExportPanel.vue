<script setup lang="ts">
const props = defineProps<{
  releaseId: string
}>()

const { exporting, exportRelease } = useReleaseExport()
</script>

<template>
  <UCard>
    <h2 class="mb-4 text-lg font-semibold">Export Release</h2>
    <UButton
      label="Export JSON"
      icon="i-lucide-download"
      :loading="exporting"
      @click="exportRelease(props.releaseId)"
    />
  </UCard>
</template>
