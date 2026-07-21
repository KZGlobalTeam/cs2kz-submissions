<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import CourseEditorList from './CourseEditorList.vue'
import MapperListField from './MapperListField.vue'
import { useSubmissionForm } from '~/composables/useSubmissionForm'

const { form } = useSubmissionForm()
const submitting = shallowRef(false)

const mapperSchema = z.object({
  steamId64: z.string().min(1, 'SteamID64 is required'),
  displayName: z.string().min(1, 'Display name is required'),
})

const imageSchema = z.object({
  url: z.string().min(1),
  mime: z.string(),
  width: z.number(),
  height: z.number(),
  sizeBytes: z.number(),
})

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  image: imageSchema
    .nullable()
    .refine((value) => value !== null, 'Course image is required (JPG, 1920x1080)'),
  mappers: z.array(mapperSchema).min(1, 'At least one mapper is required'),
})

const schema = z.object({
  mapName: z.string().min(1, 'Map name is required'),
  workshopUrl: z.string().min(1, 'Workshop URL is required').url('Must be a valid URL'),
  notes: z.string().optional(),
  mappers: z.array(mapperSchema).min(1, 'At least one map mapper is required'),
  courses: z.array(courseSchema).min(1, 'At least one course is required'),
})

type Schema = z.output<typeof schema>

async function onSubmit(_event: FormSubmitEvent<Schema>) {
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
  <UForm :state="form" :schema="schema" class="space-y-6" @submit="onSubmit">
    <h1 class="text-2xl font-semibold">New Submission</h1>

    <div class="grid gap-4">
      <UFormField label="Map Name" name="mapName" required>
        <UInput
          v-model="form.mapName"
          placeholder="kz_example_map"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Steam Workshop URL" name="workshopUrl" required>
        <UInput
          v-model="form.workshopUrl"
          placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..."
          class="w-full"
        />
      </UFormField>

      <UFormField label="Notes" name="notes">
        <UTextarea
          v-model="form.notes"
          :rows="3"
          placeholder="Optional notes"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField name="mappers">
      <MapperListField v-model="form.mappers" label="Map Mappers" />
    </UFormField>

    <UFormField name="courses">
      <CourseEditorList v-model="form.courses" />
    </UFormField>

    <div class="flex justify-end">
      <UButton
        type="submit"
        label="Submit"
        icon="i-lucide-send"
        :loading="submitting"
      />
    </div>
  </UForm>
</template>
