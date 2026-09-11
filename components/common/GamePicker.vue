<script setup lang="ts">
import { gameOptions } from '~/shared/utils/games'
import type { Game } from '~/shared/schemas/game'

/**
 * The segmented CS2 | CS:GO control, driven by a v-model bound to the current
 * selection. Pure presentation: it never reads or writes the preference
 * cookie or the route — the sign-in picker and the user-card switch layer
 * their own behavior (preference write, navigation) over it, sharing the
 * same options and labels so the game vocabulary is uniform. Rendered as a
 * table-variant radio group laid out horizontally, so the selection is a
 * proper fieldset rather than a button strip.
 */
const model = defineModel<Game>({ required: true })

// URadioGroup's items prop is mutable-typed; spread the (constant, readonly)
// option list once so vue-tsc accepts it.
const items = gameOptions.map((option) => ({ ...option }))
</script>

<template>
  <URadioGroup
    v-model="model"
    :items="items"
    variant="table"
    orientation="horizontal"
    size="sm"
    indicator="hidden"
    :ui="{
      // The hidden indicator leaves an empty dot-slot; drop it entirely so
      // the row is as slim as the old segmented button strip. Compact
      // padding mirrors the picker's former `sm` UButton footprint.
      container: 'hidden',
      item: 'px-2.5 py-1.5',
    }"
    aria-label="Select game"
  />
</template>
