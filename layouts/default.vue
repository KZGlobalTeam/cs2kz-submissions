<script setup lang="ts">
import GameSwitcher from '~/components/common/GameSwitcher.vue'
import { gamePath } from '~/shared/utils/games'

const { session, refreshSession, logout, isApprover, isLeadApprover, pending, logoutPending } = useSession()
const { game } = useGameRoute()

await callOnce(async () => {
  await refreshSession()
})

const navigation = computed(() => {
  const items = [
    { label: 'My Submissions', to: gamePath(game.value, '/submissions') },
  ]

  if (isApprover.value) {
    items.push({ label: 'Review', to: gamePath(game.value, '/review') })
  }

  if (isLeadApprover.value) {
    items.push({ label: 'Releases', to: gamePath(game.value, '/releases') })
    items.push({ label: 'Approvers', to: gamePath(game.value, '/admin/approvers') })
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
        <UButton v-else to="/cs2" variant="outline" size="sm" label="Sign in" />
      </div>

      <UNavigationMenu :items="navigation" orientation="vertical" class="w-full" />

      <div v-if="pending" class="mt-6 flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        Loading session…
      </div>
    </aside>

    <div class="min-w-0 flex-1">
      <!-- The game spine's only switcher: the single place the game changes.
           The page below is keyed by the game so flipping context remounts
           every page — no per-form game state survives the switch, which is
           what makes leaving the editor discard unsaved edits. -->
      <header
        class="flex h-14 items-center justify-end border-b border-white/5 bg-panel/40 px-4 lg:px-6"
      >
        <GameSwitcher />
      </header>

      <div class="px-4 py-6 lg:px-6">
        <main :key="game">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
