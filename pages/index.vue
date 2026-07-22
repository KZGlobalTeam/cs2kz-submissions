<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { session, refreshSession } = useSession()

const checking = ref(true)

void (async () => {
  await callOnce(async () => {
    await refreshSession()
  })
  checking.value = false
})()
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 lg:px-6">
    <div class="grid w-full gap-6 lg:grid-cols-[1.3fr_0.9fr]">
      <section class="rounded-lg border border-white/5 bg-panel/60 p-8">
        <p class="text-xs uppercase tracking-[0.45em] text-muted">CS2KZ Internal Workflow</p>
        <h1 class="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
          Map submission, review, and release export in one workspace.
        </h1>
      </section>

      <section class="rounded-lg border border-white/5 bg-panel/60 p-8">
        <h2 class="text-xl font-semibold">Steam Login</h2>

        <div v-if="checking" class="mt-6 flex items-center gap-3 text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          <span class="text-sm">Checking session…</span>
        </div>

        <div v-else class="mt-6">
          <UButton
            v-if="!session.authenticated"
            label="Sign In With Steam"
            to="/api/auth/login"
            external
          />

          <UButton
            v-else
            label="Enter Dashboard"
            to="/submissions"
          />
        </div>
      </section>
    </div>
  </div>
</template>
