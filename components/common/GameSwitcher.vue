<script setup lang="ts">
import GamePicker from '~/components/common/GamePicker.vue'
import {
  gameSwitchPath,
  PREFERRED_GAME_COOKIE,
  PREFERRED_GAME_COOKIE_MAX_AGE,
} from '~/shared/utils/games'
import type { Game } from '~/shared/schemas/game'

const { game } = useGameRoute()
const route = useRoute()
const preference = useCookie<string | null>(PREFERRED_GAME_COOKIE, {
  maxAge: PREFERRED_GAME_COOKIE_MAX_AGE,
})

/**
 * Flipping the switcher re-scopes every page to the target game: the same
 * page in the target game's segment (query preserved), except the edit page,
 * which exits to the target game's submissions overview — the switch is a
 * navigation, and navigation away from the editor discards its in-progress
 * form (there is no per-form game state to reset).
 *
 * The switch is navigation *plus* preference write, never one without the
 * other: flipping it also records the target as the preferred game, so the
 * next sign-in lands where the user last worked.
 */
async function switchGame(target: Game) {
  if (target === game.value) {
    return
  }
  preference.value = target
  const { path, preserveQuery } = gameSwitchPath(target, route.path)
  await navigateTo({
    path,
    ...(preserveQuery ? { query: route.query } : {}),
  })
}
</script>

<template>
  <GamePicker :model-value="game" @update:model-value="switchGame" />
</template>
