<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { session, refreshSession } = useSession()

await callOnce(async () => {
  await refreshSession()
})
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

        <div class="mt-6">
          <UButton
            v-if="!session.authenticated"
            size="lg"
            label="Sign In With Steam"
            icon="i-lucide-steam"
            to="/api/auth/login"
            external
          />

          <UButton
            v-else
            size="lg"
            label="Enter Dashboard"
            icon="i-lucide-arrow-right"
            to="/submissions"
          />
        </div>
      </section>
    </div>
  </div>
</template>
