<script setup lang="ts">
type ConfirmColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: ConfirmColor
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

/**
 * On cancel (or X / ESC / backdrop) we close immediately. On confirm we only
 * emit — the parent owns closing so it can show a loading state while the
 * destructive call is in flight, then close on success/failure.
 */
function onCancel() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="props.open"
    :title="props.title"
    :description="props.description"
    :ui="{ body: 'p-4 sm:p-4' }"
    @update:open="(value) => emit('update:open', value)"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          variant="outline"
          color="neutral"
          :label="props.cancelLabel ?? 'Cancel'"
          :disabled="props.loading"
          @click="onCancel"
        />
        <UButton
          :color="props.confirmColor ?? 'primary'"
          :label="props.confirmLabel ?? 'Confirm'"
          :loading="props.loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
