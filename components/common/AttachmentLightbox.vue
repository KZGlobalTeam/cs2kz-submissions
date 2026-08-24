<script setup lang="ts">
import type { RejectionAttachment } from '~/shared/types/attachment'

/**
 * Full-size viewer for rejection attachments. Controlled: the parent opens it
 * with `open`, supplies the current `items` and the `start` index; closing via
 * ESC / backdrop / X emits `update:open false`. Previous/next navigation is
 * shown when a rejection has more than one image.
 */
const props = defineProps<{
  open: boolean
  items: RejectionAttachment[]
  start?: number
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const index = ref(0)

watch(
  () => [props.open, props.start, props.items] as const,
  () => {
    if (!props.open) {
      return
    }
    const clamped = Math.min(
      Math.max(props.start ?? 0, 0),
      Math.max(props.items.length - 1, 0),
    )
    index.value = clamped
  },
  { immediate: true },
)

const current = computed(() => props.items[index.value])

function previous() {
  if (!props.items.length) {
    return
  }
  index.value = (index.value - 1 + props.items.length) % props.items.length
}

function next() {
  if (!props.items.length) {
    return
  }
  index.value = (index.value + 1) % props.items.length
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{
      content: 'sm:max-w-4xl',
      body: 'p-4 sm:p-4',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col items-center gap-3">
        <img
          v-if="current"
          :src="current.url"
          :alt="`Rejection attachment ${index + 1}`"
          class="max-h-[82vh] w-auto rounded-md object-contain"
        >
        <div v-if="items.length > 1" class="flex items-center gap-3">
          <UButton
            icon="i-lucide-chevron-left"
            variant="outline"
            color="neutral"
            size="sm"
            aria-label="Previous attachment"
            @click="previous"
          />
          <span class="text-sm text-muted">{{ index + 1 }} / {{ items.length }}</span>
          <UButton
            icon="i-lucide-chevron-right"
            variant="outline"
            color="neutral"
            size="sm"
            aria-label="Next attachment"
            @click="next"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>