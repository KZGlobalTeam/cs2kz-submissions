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
      <!-- The signed-in user card: the account row (avatar / name / logout)
           with the game switch beneath it. The switch is the single place the
           game changes — flipping it re-scopes every page and updates the
           preferred game, so the next sign-in lands where the user last
           worked. Signed-out visitors never see this sidebar: the auth
           middleware bounces every game page to the bare sign-in page. -->
      <div
        v-if="session.user"
        class="mb-4 rounded-lg border border-white/5 bg-panel/60 px-3 py-2"
      >
        <div class="flex items-center justify-between gap-2">
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
        </div>
        <div class="mt-2 border-t border-white/5 pt-2">
          <GameSwitcher />
        </div>
      </div>

      <UNavigationMenu :items="navigation" orientation="vertical" class="w-full" />

      <div v-if="pending" class="mt-6 flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
        Loading session…
      </div>
    </aside>

    <div class="min-w-0 flex-1">
      <!-- The main column has no header: the game switch lived in the top bar
           and moved into the user card, so the header had nothing left. The
           page below is keyed by the game so flipping context remounts every
           page — no per-form game state survives the switch, which is what
           makes leaving the editor discard unsaved edits. -->
      <div class="px-4 py-6 lg:px-6">
        <main :key="game">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
