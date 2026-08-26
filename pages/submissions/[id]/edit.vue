<script setup lang="ts">
import type { SubmissionDetailResponse } from '~/shared/types/submission-detail'
import SubmissionForm from '~/components/submission/SubmissionForm.vue'
import type { SubmissionFormValue } from '~/composables/useSubmissionForm'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const toast = useToast()

const submissionId = computed(() => String(route.params.id))

const loading = shallowRef(true)
const initialValue = shallowRef<SubmissionFormValue | null>(null)

/** Maps the detail response onto the form's editable state: nulls become
 *  empty strings, the stored port-authorization columns become an image
 *  meta, and mapper snapshots become the loose mapper inputs. */
function toFormValue(details: SubmissionDetailResponse): SubmissionFormValue {
  const { submission } = details

  return {
    workshopUrl: submission.workshopUrl,
    mapName: submission.mapName,
    notes: submission.notes ?? '',
    isPort: submission.isPort,
    portAuthorizationImage:
      submission.isPort &&
      submission.portAuthorizationImageUrl &&
      submission.portAuthorizationImageMime &&
      submission.portAuthorizationImageWidth != null &&
      submission.portAuthorizationImageHeight != null &&
      submission.portAuthorizationImageSizeBytes != null
        ? {
            url: submission.portAuthorizationImageUrl,
            mime: submission.portAuthorizationImageMime,
            width: submission.portAuthorizationImageWidth,
            height: submission.portAuthorizationImageHeight,
            sizeBytes: submission.portAuthorizationImageSizeBytes,
          }
        : null,
    portNotes: submission.portNotes ?? '',
    mappers: details.mappers.map((mapper) => ({
      steamId64: mapper.steamId64,
      displayName: mapper.displayNameSnapshot,
    })),
    courses: [...details.courses]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((course) => ({
        name: course.name,
        image: {
          url: course.imageUrl,
          mime: course.imageMime,
          width: course.imageWidth,
          height: course.imageHeight,
          sizeBytes: course.imageSizeBytes,
        },
        mappers: course.mappers.map((mapper) => ({
          steamId64: mapper.steamId64,
          displayName: mapper.displayNameSnapshot,
        })),
      })),
  }
}

onMounted(async () => {
  try {
    const details =
      await $fetch<SubmissionDetailResponse>(`/api/submissions/${submissionId.value}`)

    // Anything not owned, pending, and vote-free redirects away. `editable` is
    // derived server-side from the live vote count (the votes payload is
    // stripped from non-approvers), so a vote that landed after the list
    // rendered is caught here.
    if (!details.editable) {
      toast.add({
        color: 'error',
        title: 'Not editable',
        description: 'A submission can only be edited while it is pending and no approver has voted yet.',
      })
      await navigateTo('/submissions')
      return
    }

    initialValue.value = toFormValue(details)
  }
  catch (error: unknown) {
    const message = error && typeof error === 'object' && 'statusMessage' in error
      ? String((error as { statusMessage: unknown }).statusMessage)
      : 'Submission not found'
    toast.add({
      color: 'error',
      title: 'Cannot edit',
      description: message,
    })
    await navigateTo('/submissions')
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <section v-if="loading" class="grid gap-4">
    <UCard>
      <div class="flex items-center gap-3 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        <span class="text-sm">Loading submission…</span>
      </div>
    </UCard>
  </section>

  <SubmissionForm
    v-else-if="initialValue"
    mode="edit"
    :submission-id="submissionId"
    :initial-value="initialValue"
  />
</template>