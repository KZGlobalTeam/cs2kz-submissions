<script setup lang="ts">
import { tierToNumber } from '~/shared/schemas/cs2kz'
import { finalFiltersForGame, modeLabel } from '~/shared/schemas/course-mode'
import type { Game } from '~/shared/schemas/game'
import type { SubmissionDetailCourse } from '~/shared/types/submission-detail'

/**
 * The read-only courses section of the submission details page: one card per
 * Course (name, mappers, image) and, on decided submissions, the Course's
 * Finalized filters — the mapper-facing detail view and the fallback for
 * reviewers who never entered a review panel. Finalized filters render per
 * the submission's game (`game` is the page-passed row game — the row is
 * truth): the game's own modes in the game's render order, so a decided
 * CS:GO submission shows KZT, SKZ, and VNL rows per course while CS2 shows
 * CKZ and VNL exactly as today. A stored filter of another game never
 * renders (impossible through the review-write guard, but the render stays
 * honest regardless of what the payload carried).
 */
const props = defineProps<{
  courses: SubmissionDetailCourse[]
  /** The submission's game — the page passes the value from the detail
   *  payload's own row. */
  game: Game
}>()

/** Each Course plus its Finalized filters in the game's render order (the
 *  vocabulary lives in `finalFiltersForGame`, shared with the tests). */
const view = computed(() =>
  props.courses.map((course) => ({
    course,
    finalFilters: finalFiltersForGame(course.finalFilters, props.game),
  })),
)
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="item in view"
      :key="item.course.id"
      class="border border-white/5 bg-white/3 rounded-lg p-4"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold">{{ item.course.name }}</h3>
          <p class="mt-1 text-sm text-muted">
            Mappers: {{ item.course.mappers.map((mapper) => mapper.displayNameSnapshot).join(', ') }}
          </p>
        </div>
        <img :src="item.course.imageUrl" :alt="item.course.name" class="h-20 w-36 rounded-md object-cover">
      </div>

      <div v-if="item.finalFilters.length" class="mt-4 space-y-2 text-sm text-zinc-300">
        <p class="text-muted">Final filters</p>
        <div
          v-for="filter in item.finalFilters"
          :key="`${item.course.id}-${filter.mode}`"
          class="rounded-md border border-white/5 bg-black/20 px-3 py-2"
        >
          {{ modeLabel(filter.mode) }} | {{ filter.isRanked ? 'Ranked' : 'Unranked' }} | NUB - {{ tierToNumber(filter.nubTier) }} | PRO - {{ tierToNumber(filter.proTier) }}
        </div>
      </div>
    </div>
  </div>
</template>
