<script setup lang="ts">
import { gameOptions, gameSwitchPath } from '~/shared/utils/games'
import type { Game } from '~/shared/schemas/game'

const { game } = useGameRoute()
const route = useRoute()

/**
 * Flipping the switcher re-scopes every page to the target game: the same
 * page in the target game's segment (query preserved), except the edit page,
 * which exits to the target game's submissions overview — the switch is a
 * navigation, and navigation away from the editor discards its in-progress
 * form (there is no per-form game state to reset).
 */
async function switchGame(target: Game) {
  if (target === game.value) {
    return
  }
  const { path, preserveQuery } = gameSwitchPath(target, route.path)
  await navigateTo({
    path,
    ...(preserveQuery ? { query: route.query } : {}),
  })
}
</script>

<template>
  <div
    class="flex items-center gap-1 rounded-lg border border-white/5 bg-panel/60 p-1"
    role="group"
    aria-label="Switch game"
  >
    <UButton
      v-for="option in gameOptions"
      :key="option.value"
      size="sm"
      :label="option.label"
      :variant="game === option.value ? 'solid' : 'ghost'"
      :color="game === option.value ? 'primary' : 'neutral'"
      @click="switchGame(option.value)"
    />
  </div>
</template>
