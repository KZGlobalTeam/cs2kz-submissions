<script setup lang="ts">
definePageMeta({
  layout: false
})

const { session, refreshSession } = useSession()

const checking = ref(true)
const loginPending = ref(false)

function handleLogin() {
  if (loginPending.value) {
    return
  }

  loginPending.value = true
  void navigateTo('/api/auth/login', {
    external: true,
  })
}

void (async () => {
  await callOnce(async () => {
    await refreshSession()
  })
  checking.value = false

  // If a valid (non-expired) session already exists, skip the login page and
  // head straight to the dashboard instead of showing an "Enter Dashboard"
  // button.
  if (session.value.authenticated) {
    await navigateTo('/submissions')
  }
})()
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 lg:px-6">
    <section class="w-full max-w-3xl rounded-lg border border-white/5 bg-panel/60 p-8 lg:p-10">
      <p class="text-2xl font-semibold uppercase tracking-[0.2rem] text-gray-300">CS2KZ Global Submission Portal</p>

      <div class="mt-8 border-t border-white/5 pt-8">
        <h1 class="text-xl font-semibold">Steam Login</h1>

        <div v-if="checking" class="mt-6 flex items-center gap-3 text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          <span class="text-sm">Checking session…</span>
        </div>

        <div v-else class="mt-6">
          <UButton
            v-if="!session.authenticated"
            label="Sign In With Steam"
            :loading="loginPending"
            :disabled="loginPending"
            @click="handleLogin"
          />
        </div>
      </div>
    </section>
  </div>
</template>
