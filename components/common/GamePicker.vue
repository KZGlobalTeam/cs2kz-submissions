<script setup lang="ts">
import { gameOptions } from '~/shared/utils/games'
import type { Game } from '~/shared/schemas/game'

/**
 * The segmented CS2 | CS:GO control, driven by a v-model bound to the current
 * selection. Pure presentation: it never reads or writes the preference
 * cookie or the route — the sign-in picker and the user-card switch layer
 * their own behavior (preference write, navigation) over it, sharing the
 * same options and labels so the game vocabulary is uniform.
 */
const model = defineModel<Game>({ required: true })
</script>

<template>
  <div
    class="flex items-center gap-1 rounded-lg border border-white/5 bg-panel/60 p-1"
    role="group"
    aria-label="Select game"
  >
    <UButton
      v-for="option in gameOptions"
      :key="option.value"
      size="sm"
      :label="option.label"
      :variant="model === option.value ? 'solid' : 'ghost'"
      :color="model === option.value ? 'primary' : 'neutral'"
      @click="model = option.value"
    />
  </div>
</template>
