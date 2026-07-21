<script setup lang="ts">
import type { SubmissionDetailCourse } from '~/shared/types/submission-detail'

defineProps<{
  courses: SubmissionDetailCourse[]
}>()
</script>

<template>
  <section class="panel rounded-[1.5rem] p-5">
    <h2 class="mb-4 text-xl font-semibold">Courses</h2>

    <div class="space-y-4">
      <div
        v-for="course in courses"
        :key="course.id"
        class="rounded-[1.25rem] border border-white/5 bg-white/5 p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold">{{ course.name }}</h3>
            <p class="mt-2 text-sm text-muted">
              Mappers: {{ course.mappers.map((mapper) => mapper.displayNameSnapshot).join(', ') }}
            </p>
          </div>
          <img :src="course.imageUrl" :alt="course.name" class="h-28 w-52 rounded-2xl object-cover">
        </div>

        <div v-if="course.finalFilters.length" class="mt-4 space-y-2 text-sm text-zinc-300">
          <p class="text-muted">Final filters</p>
          <div
            v-for="filter in course.finalFilters"
            :key="`${course.id}-${filter.mode}`"
            class="rounded-2xl border border-white/5 bg-black/20 p-3"
          >
            {{ filter.mode }} | state {{ filter.state }} | nub {{ filter.nubTier }} | pro {{ filter.proTier }} | ranked {{ filter.isRanked ? 'yes' : 'no' }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
