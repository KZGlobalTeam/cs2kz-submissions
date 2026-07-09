<script setup lang="ts">
import CourseEditorList from './CourseEditorList.vue'
import MapperListField from './MapperListField.vue'

const { form } = useSubmissionForm()
const submitting = shallowRef(false)

async function submit() {
  submitting.value = true

  try {
    await $fetch('/api/submissions', {
      method: 'POST',
      body: {
        workshopUrl: form.workshopUrl,
        mapName: form.mapName,
        notes: form.notes || null,
        mappers: form.mappers,
        courses: form.courses.map((course) => ({
          ...course,
          image: course.image!,
        })),
      },
    })

    await navigateTo('/submissions')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="panel rounded-[1.75rem] p-6">
    <div class="mb-6">
      <p class="text-xs uppercase tracking-[0.35em] text-muted">Mapper Submission</p>
      <h1 class="mt-3 text-3xl font-semibold">Create A New Submission</h1>
      <p class="mt-2 max-w-3xl text-sm text-muted">
        提交创意工坊链接、地图名称、mapper 列表以及每个 course 的截图和参与人员。
      </p>
    </div>

    <div class="grid gap-6">
      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <label class="field-label">Steam Workshop URL</label>
          <input v-model="form.workshopUrl" class="field-input" placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..." />
        </div>

        <div>
          <label class="field-label">Map Name</label>
          <input v-model="form.mapName" class="field-input" placeholder="kz_example_map" />
        </div>
      </div>

      <div>
        <label class="field-label">Notes</label>
        <textarea v-model="form.notes" class="field-input min-h-28" placeholder="额外备注（可选）" />
      </div>

      <MapperListField v-model="form.mappers" label="Map Mappers" />
      <CourseEditorList v-model="form.courses" />

      <div class="flex justify-end">
        <button class="primary-button" type="button" :disabled="submitting" @click="submit">
          {{ submitting ? 'Submitting...' : 'Submit Map' }}
        </button>
      </div>
    </div>
  </section>
</template>
