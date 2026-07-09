<script setup lang="ts">
import MapperListField from './MapperListField.vue'

interface MapperInput {
  steamId64: string
  steamId: string
  displayName: string
}

interface CourseImage {
  url: string
  mime: string
  width: number
  height: number
  sizeBytes: number
}

interface CourseInput {
  name: string
  image: CourseImage | null
  mappers: MapperInput[]
}

const props = defineProps<{
  course: CourseInput
  index: number
}>()

const emit = defineEmits<{
  update: [value: CourseInput]
  remove: []
}>()

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
    alert('课程图片必须是 JPG 且分辨率为 1920x1080')
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
  <section class="rounded-[1.5rem] border border-white/5 bg-black/20 p-5">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">Course {{ index + 1 }}</h3>
      <button class="secondary-button text-xs" type="button" @click="emit('remove')">
        Remove Course
      </button>
    </div>

    <div class="grid gap-4">
      <div>
        <label class="field-label">Course Name</label>
        <input
          :value="course.name"
          class="field-input"
          placeholder="Course 1"
          @input="updateCourse({ name: ($event.target as HTMLInputElement).value })"
        >
      </div>

      <div>
        <label class="field-label">Course Image (JPG, 1920x1080)</label>
        <input class="field-input" type="file" accept=".jpg,.jpeg,image/jpeg" @change="onFileChange">
        <p class="mt-2 text-xs text-muted">
          {{ uploading ? 'Uploading...' : course.image?.url ?? 'No image uploaded yet' }}
        </p>
      </div>

      <MapperListField
        :model-value="course.mappers"
        label="Course Mappers"
        @update:model-value="updateCourse({ mappers: $event })"
      />
    </div>
  </section>
</template>
