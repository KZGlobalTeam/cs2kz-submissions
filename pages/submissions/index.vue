<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const { data: submissions, refresh } = await useAsyncData('submissions', () =>
  $fetch('/api/submissions'),
)

function refreshSubmissions() {
  return refresh()
}
</script>

<template>
  <section class="grid gap-6">
    <div class="panel rounded-[1.75rem] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-muted">Submission Queue</p>
          <h1 class="mt-3 text-3xl font-semibold">All Submissions</h1>
        </div>
        <div class="flex gap-3">
          <button class="secondary-button text-sm" type="button" @click="refreshSubmissions">
            Refresh
          </button>
          <NuxtLink class="primary-button text-sm" to="/submissions/new">
            New Submission
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="grid gap-4">
      <NuxtLink
        v-for="submission in submissions ?? []"
        :key="submission.id"
        :to="`/submissions/${submission.id}`"
        class="panel block rounded-[1.5rem] p-5 transition hover:border-accent/30"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold">{{ submission.mapName }}</h2>
            <p class="mt-2 text-sm text-muted">
              Workshop ID: {{ submission.workshopId }} · Created {{ new Date(submission.createdAt).toLocaleString() }}
            </p>
          </div>

          <span class="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted">
            {{ submission.status }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
