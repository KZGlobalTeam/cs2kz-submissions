<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import CourseEditorList from './CourseEditorList.vue'
import MapperListField from './MapperListField.vue'
import { useSubmissionForm } from '~/composables/useSubmissionForm'

const { form } = useSubmissionForm()
const submitting = shallowRef(false)
const uploadingPortImage = shallowRef(false)

const toast = useToast()

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

const portImageSchema = z.object({
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

const schema = z
  .object({
    mapName: z.string().min(1, 'Map name is required'),
    workshopUrl: z.string().min(1, 'Workshop URL is required').url('Must be a valid URL'),
    notes: z.string().optional(),
    isPort: z.boolean(),
    portAuthorizationImage: portImageSchema.nullable(),
    portNotes: z.string().optional(),
    mappers: z.array(mapperSchema).min(1, 'At least one map mapper is required'),
    courses: z.array(courseSchema).min(1, 'At least one course is required'),
  })
  .superRefine((value, ctx) => {
    if (value.isPort && !value.portAuthorizationImage) {
      ctx.addIssue({
        code: 'custom',
        message: 'An authorization screenshot from the original author is required for ported maps',
        path: ['portAuthorizationImage'],
      })
    }
  })

type Schema = z.output<typeof schema>

const ACCEPTED_PORT_TYPES = ['image/jpeg', 'image/png']

async function onPortFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  if (!ACCEPTED_PORT_TYPES.includes(file.type)) {
    toast.add({
      color: 'error',
      title: 'Invalid image',
      description: 'The screenshot must be a JPG or PNG file.',
    })
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  uploadingPortImage.value = true
  try {
    const result = await $fetch('/api/uploads/port-image', {
      method: 'POST',
      body: formData,
    })
    form.portAuthorizationImage = result
  } catch (error: unknown) {
    const message = error && typeof error === 'object' && 'statusMessage' in error
      ? String((error as { statusMessage: unknown }).statusMessage)
      : 'Failed to upload screenshot'
    toast.add({
      color: 'error',
      title: 'Upload failed',
      description: message,
    })
  } finally {
    uploadingPortImage.value = false
  }
}

function clearPortImage() {
  form.portAuthorizationImage = null
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  submitting.value = true
  try {
    await $fetch('/api/submissions', {
      method: 'POST',
      body: {
        workshopUrl: form.workshopUrl,
        mapName: form.mapName,
        notes: form.notes || null,
        isPort: form.isPort,
        portAuthorizationImage: form.isPort ? form.portAuthorizationImage : null,
        portNotes: form.isPort ? (form.portNotes || null) : null,
        mappers: form.mappers,
        courses: form.courses.map((course) => ({
          ...course,
          image: course.image!,
        })),
      },
    })

    // Drop the cached submissions list so the index page refetches (and shows
    // the table loading state) instead of rendering the stale list.
    clearNuxtData('submissions')
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

      <UFormField name="isPort">
        <UCheckbox
          v-model="form.isPort"
          label="This map is a port"
          x
        />
      </UFormField>

      <div
        v-if="form.isPort"
        class="grid gap-4 rounded-lg border border-white/5 bg-black/20 p-4"
      >
        <UFormField
          label="Proof of permission"
          name="portAuthorizationImage"
          required
        >
          <UInput
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            :ui="{ base: 'file:mr-3 file:rounded-md file:border-0 file:bg-white/5 file:px-3 file:py-1' }"
            @change="onPortFileChange"
          />
          <p v-if="uploadingPortImage" class="mt-2 text-xs text-muted">
            Uploading…
          </p>
          <div v-if="form.portAuthorizationImage?.url" class="mt-2 flex items-start gap-3">
            <img
              :src="form.portAuthorizationImage.url"
              alt="Proof of permission"
              class="h-auto max-h-64 w-auto rounded-md border border-white/10"
            >
            <UButton
              variant="ghost"
              color="error"
              label="Remove"
              @click="clearPortImage"
            />
          </div>
        </UFormField>

        <UFormField label="Port Notes" name="portNotes">
          <UTextarea
            v-model="form.portNotes"
            :rows="3"
            placeholder=""
            class="w-full"
          />
        </UFormField>
      </div>
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
        :loading="submitting"
      />
    </div>
  </UForm>
</template>
