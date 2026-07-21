<script setup lang="ts">
import MapperListField from './MapperListField.vue'
import type { CourseInput } from '~/composables/useSubmissionForm'

const props = defineProps<{
  course: CourseInput
  index: number
}>()

const emit = defineEmits<{
  update: [value: CourseInput]
  remove: []
}>()

const toast = useToast()

const uploading = shallowRef(false)

function updateCourse(patch: Partial<CourseInput>) {
  emit('update', { ...props.course, ...patch })
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  const bitmap = await createImageBitmap(file)
  if (file.type !== 'image/jpeg' || bitmap.width !== 1920 || bitmap.height !== 1080) {
    toast.add({
      color: 'error',
      title: 'Invalid image',
      description: 'Course image must be a JPG at 1920x1080.',
    })
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  uploading.value = true
  try {
    const result = await $fetch('/api/uploads/course-image', {
      method: 'POST',
      body: formData,
    })
    updateCourse({ image: result })
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <section class="rounded-lg border border-white/5 bg-black/20 p-4">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">Course {{ index + 1 }}</h3>
      <UButton
        size="xs"
        variant="ghost"
        color="error"
        icon="i-lucide-trash"
        label="Remove Course"
        @click="emit('remove')"
      />
    </div>

    <div class="grid gap-4">
      <UFormField label="Course Name" required>
        <UInput
          :model-value="course.name"
          placeholder="Course 1"
          class="w-full"
          @update:model-value="updateCourse({ name: $event })"
        />
      </UFormField>

      <UFormField label="Course Image (JPG, 1920x1080)" required>
        <UInput
          type="file"
          accept=".jpg,.jpeg,image/jpeg"
          :ui="{ base: 'file:mr-3 file:rounded-md file:border-0 file:bg-white/5 file:px-3 file:py-1' }"
          @change="onFileChange"
        />
        <p class="mt-2 flex items-center gap-2 text-xs text-muted">
          <UIcon
            v-if="uploading"
            name="i-lucide-loader-circle"
            class="animate-spin"
          />
          <span>{{ uploading ? 'Uploading…' : (course.image?.url ?? 'No image uploaded yet') }}</span>
        </p>
      </UFormField>

      <MapperListField
        :model-value="course.mappers"
        label="Course Mappers"
        @update:model-value="updateCourse({ mappers: $event })"
      />
    </div>
  </section>
</template>
