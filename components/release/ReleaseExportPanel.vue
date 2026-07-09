<script setup lang="ts">
const props = defineProps<{
  releaseId: string
}>()

const { exporting, exportRelease } = useReleaseExport()
</script>

<template>
  <section class="panel rounded-[1.5rem] p-5">
    <div class="mb-4">
      <h2 class="text-xl font-semibold">Export Release</h2>
      <p class="mt-2 text-sm text-muted">导出符合 CS2KZ `NewMap[]` schema 的 JSON 文件。</p>
    </div>

    <button
      class="primary-button"
      type="button"
      :disabled="exporting"
      @click="exportRelease(props.releaseId)"
    >
      {{ exporting ? 'Exporting...' : 'Export JSON' }}
    </button>
  </section>
</template>
