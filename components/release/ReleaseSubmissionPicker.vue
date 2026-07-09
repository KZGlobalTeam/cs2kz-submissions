<script setup lang="ts">
defineProps<{
  releaseId: string
  approvedSubmissions: Array<{
    id: string
    mapName: string
  }>
}>()

const selectedSubmission = shallowRef('')
const adding = shallowRef(false)

async function addToRelease() {
  if (!selectedSubmission.value) {
    return
  }

  adding.value = true
  try {
    await $fetch(`/api/releases/${useRoute().params.id}/submissions`, {
      method: 'POST',
      body: {
        submissionId: selectedSubmission.value,
      },
    })
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <section class="panel rounded-[1.5rem] p-5">
    <h2 class="text-xl font-semibold">Add Approved Submission</h2>
    <div class="mt-4 flex gap-3">
      <select v-model="selectedSubmission" class="field-input">
        <option value="">Select submission</option>
        <option
          v-for="submission in approvedSubmissions"
          :key="submission.id"
          :value="submission.id"
        >
          {{ submission.mapName }}
        </option>
      </select>
      <button class="secondary-button" type="button" :disabled="adding" @click="addToRelease">
        Add
      </button>
    </div>
  </section>
</template>
