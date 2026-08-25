<script setup lang="ts">
import { MAX_REJECTION_ATTACHMENT_BYTES } from '~/shared/schemas/attachment'
import type { RejectionAttachment } from '~/shared/types/attachment'

import AttachmentLightbox from './AttachmentLightbox.vue'

/**
 * Staged rejection attachments: an upload control plus a wrapping row of
 * thumbnails with per-item remove and click-to-zoom. Shared by the approver
 * vote form and the lead decision panel.
 *
 * `stored` is the previously-saved attachment set; `active` is whether the
 * rejection decision is currently selected. When the reviewer switches away
 * from rejection, staged uploads that were never saved are discarded and
 * their storage objects deleted (rejection-only rule) while the saved set is
 * kept, so toggling back restores exactly what was stored before.
 */
const props = defineProps<{
  modelValue: RejectionAttachment[]
  stored?: RejectionAttachment[]
  active: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: RejectionAttachment[]] }>()

const toast = useToast()
const fileInput = shallowRef<HTMLInputElement | null>(null)
const uploading = shallowRef(false)
const lightboxIndex = ref<number | null>(null)

function pick() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-selecting the same file
  if (!file) {
    return
  }

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    toast.add({ color: 'error', title: 'Unsupported file type', description: 'Rejection attachments must be JPG or PNG files.' })
    return
  }
  if (file.size > MAX_REJECTION_ATTACHMENT_BYTES) {
    toast.add({ color: 'error', title: 'File too large', description: 'Rejection attachments must be smaller than 10 MB.' })
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const attachment = await $fetch<RejectionAttachment>('/api/uploads/rejection-attachment', {
      method: 'POST',
      body: formData,
    })
    emit('update:modelValue', [...props.modelValue, attachment])
  }
  catch (error) {
    toast.add({
      color: 'error',
      title: 'Upload failed',
      description: (error as { data?: { message?: string } }).data?.message ?? 'The image could not be uploaded.',
    })
  }
  finally {
    uploading.value = false
  }
}

async function deleteAttachmentObject(url: string) {
  try {
    // URL goes in the query string, NOT the body: the Cloudflare Pages runtime
    // drops DELETE request bodies at the worker entry (only POST/PUT/PATCH are
    // forwarded), which crashes workerd with a 1101.
    await $fetch('/api/uploads/rejection-attachment', {
      method: 'DELETE',
      query: { url },
    })
  }
  catch {
    // Deletion is best-effort here; the save path re-deletes anything that
    // dropped out, so a failed removal is not left forever.
  }
}

function removeAttachment(attachment: RejectionAttachment) {
  emit('update:modelValue', props.modelValue.filter((item) => item.url !== attachment.url))
  void deleteAttachmentObject(attachment.url)
}

/** Discard staged uploads that were never saved, deleting their objects. */
function purgeNonStored() {
  const storedUrls = new Set((props.stored ?? []).map((item) => item.url))
  const unsaved = props.modelValue.filter((item) => !storedUrls.has(item.url))
  if (!unsaved.length) {
    return
  }
  emit('update:modelValue', props.modelValue.filter((item) => storedUrls.has(item.url)))
  for (const item of unsaved) {
    void deleteAttachmentObject(item.url)
  }
}

watch(
  () => props.active,
  (active) => {
    if (!active) {
      purgeNonStored()
    }
  },
)
</script>

<template>
  <div v-if="active" class="mt-3 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-muted">Rejection attachments ({{ modelValue.length }})</span>
      <UButton
        icon="i-lucide-image-plus"
        size="xs"
        variant="outline"
        :loading="uploading"
        label="Add image"
        @click="pick"
      />
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png"
        class="hidden"
        @change="onFileSelected"
      >
    </div>

    <div v-if="modelValue.length" class="flex flex-wrap gap-2">
      <div
        v-for="(attachment, index) in modelValue"
        :key="attachment.url"
        class="group relative"
      >
        <img
          :src="attachment.url"
          :alt="`Rejection attachment ${index + 1}`"
          class="h-16 w-24 cursor-zoom-in rounded-md border border-white/10 object-cover"
          @click="lightboxIndex = index"
        >
        <UButton
          icon="i-lucide-x"
          size="xs"
          square
          color="error"
          variant="solid"
          class="absolute -right-2 -top-2 rounded-full p-0.5"
          :aria-label="`Remove attachment ${index + 1}`"
          @click="removeAttachment(attachment)"
        />
      </div>
    </div>
  </div>

  <AttachmentLightbox
    :open="lightboxIndex !== null"
    :items="modelValue"
    :start="lightboxIndex ?? 0"
    @update:open="lightboxIndex = $event ? lightboxIndex : null"
  />
</template>