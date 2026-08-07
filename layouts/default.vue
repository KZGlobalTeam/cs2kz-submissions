<script setup lang="ts">
const { session, refreshSession, logout, isApprover, isLeadApprover, pending, logoutPending } = useSession()

await callOnce(async () => {
  await refreshSession()
})

const navigation = computed(() => {
  const items = [{ label: "My Submissions", to: "/submissions" }]

  if (isApprover.value) {
    items.push({ label: "Review", to: "/review" })
  }

  if (isLeadApprover.value) {
    items.push({ label: "Releases", to: "/releases" })
    items.push({ label: "Approvers", to: "/admin/approvers" })
  }

  return items
})
</script>

<template>
  <div class="flex min-h-screen">
    <aside
      class="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-white/5 bg-panel/40 px-4 py-6 lg:block"
    >
      <div
        class="mb-4 flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-panel/60 px-3 py-2"
      >
        <template v-if="session.user">
          <div class="flex min-w-0 items-center gap-2">
            <UAvatar
              v-if="session.user.avatarUrl"
              :src="session.user.avatarUrl"
              :alt="session.user.name"
              size="xs"
            />
            <span class="truncate text-sm text-zinc-200">{{ session.user.name }}</span>
          </div>
          <UButton
            icon="i-lucide-log-out"
            variant="ghost"
            color="neutral"
            aria-label="Sign out"
            title="Sign out"
            :loading="logoutPending"
            :disabled="logoutPending"
            @click="logout"
          />
        </template>
        <UButton v-else to="/" variant="outline" size="sm" label="Sign in" />
      </div>

      <UNavigationMenu :items="navigation" orientation="vertical" class="w-full" />

      <div v-if="pending" class="mt-6 flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        Loading session…
      </div>
    </aside>

    <div class="min-w-0 flex-1 px-4 py-6 lg:px-6">
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
