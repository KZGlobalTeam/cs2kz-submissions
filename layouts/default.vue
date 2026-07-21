<script setup lang="ts">
const { session, refreshSession, logout, isApprover, isLeadApprover, pending } =
  useSession()

await callOnce(async () => {
  await refreshSession()
})

const navigation = computed(() => {
  const items = [
    { label: isApprover.value ? 'Submissions' : 'My Submissions', to: '/submissions' },
  ]

  if (isLeadApprover.value) {
    items.push({ label: 'Releases', to: '/releases' })
    items.push({ label: 'Approvers', to: '/admin/approvers' })
  }

  return items
})
</script>

<template>
  <div class="min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
      <aside class="hidden w-64 shrink-0 lg:block">
        <div class="mb-6">
          <p class="text-xs uppercase tracking-[0.35em] text-muted">CS2KZ</p>
          <h1 class="mt-2 text-xl font-semibold">Map Review Console</h1>
        </div>

        <UNavigationMenu
          :items="navigation"
          orientation="vertical"
          class="w-full"
        />

        <div v-if="pending" class="mt-6 flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          Loading session…
        </div>
      </aside>

      <div class="min-w-0 flex-1">
        <header class="mb-6 flex items-center justify-between rounded-lg border border-white/5 bg-panel/60 px-4 py-3">
          <div class="flex items-center gap-3">
            <UAvatar
              v-if="session.user?.avatarUrl"
              :src="session.user.avatarUrl"
              :alt="session.user.name"
              size="sm"
            />
            <div class="text-sm">
              <p v-if="session.user" class="text-zinc-200">
                Signed in as <span class="font-medium">{{ session.user.name }}</span>
              </p>
              <p v-else class="text-muted">Not signed in</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="!session.user"
              to="/"
              variant="outline"
              size="sm"
              label="Sign in"
            />
            <UButton
              v-else
              variant="outline"
              size="sm"
              icon="i-lucide-log-out"
              label="Sign out"
              :loading="pending"
              @click="logout"
            />
          </div>
        </header>

        <main>
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
