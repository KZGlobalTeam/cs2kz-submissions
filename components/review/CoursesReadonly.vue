<script setup lang="ts">
import { tierToNumber } from '~/shared/schemas/cs2kz'
import type { SubmissionDetailCourse } from '~/shared/types/submission-detail'

defineProps<{
  courses: SubmissionDetailCourse[]
}>()
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="course in courses"
      :key="course.id"
      class="border border-white/5 bg-white/3 rounded-lg p-4"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold">{{ course.name }}</h3>
          <p class="mt-1 text-sm text-muted">
            Mappers: {{ course.mappers.map((mapper) => mapper.displayNameSnapshot).join(', ') }}
          </p>
        </div>
        <img :src="course.imageUrl" :alt="course.name" class="h-20 w-36 rounded-md object-cover">
      </div>

      <div v-if="course.finalFilters.length" class="mt-4 space-y-2 text-sm text-zinc-300">
        <p class="text-muted">Final filters</p>
        <div
          v-for="filter in course.finalFilters"
          :key="`${course.id}-${filter.mode}`"
          class="rounded-md border border-white/5 bg-black/20 px-3 py-2"
        >
          {{ filter.mode === 'classic' ? 'CKZ' : 'VNL' }} | {{ filter.isRanked ? 'Ranked' : 'Unranked' }} | NUB - {{ tierToNumber(filter.nubTier) }} | PRO - {{ tierToNumber(filter.proTier) }}
        </div>
      </div>
    </div>
  </div>
</template>
