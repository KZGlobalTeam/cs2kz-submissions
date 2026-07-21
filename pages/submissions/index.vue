<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const { data: submissions, refresh } = await useAsyncData('submissions', () =>
  $fetch('/api/submissions'),
)

const { hasApproverRole, isLeadApprover } = useSession()

function refreshSubmissions() {
  return refresh()
}

function openSubmission(id: string) {
  return navigateTo(`/submissions/${id}`)
}

function openVote(id: string) {
  return navigateTo(`/submissions/${id}?mode=vote`)
}

function openApprove(id: string) {
  return navigateTo(`/submissions/${id}?mode=approve`)
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
      <div
        v-for="submission in submissions ?? []"
        :key="submission.id"
        class="panel block cursor-pointer rounded-[1.5rem] p-5 transition hover:border-accent/30"
        @click="openSubmission(submission.id)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold">{{ submission.mapName }}</h2>
            <p class="mt-2 text-sm text-muted">
              Workshop ID: {{ submission.workshopId }} · Created {{ new Date(submission.createdAt).toLocaleString() }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2" @click.stop>
            <span class="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted">
              {{ submission.status }}
            </span>
            <button
              v-if="hasApproverRole"
              type="button"
              class="secondary-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="submission.status !== 'pending'"
              @click.stop="openVote(submission.id)"
            >
              Vote
            </button>
            <button
              v-if="isLeadApprover"
              type="button"
              class="primary-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="submission.status !== 'pending'"
              @click.stop="openApprove(submission.id)"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
