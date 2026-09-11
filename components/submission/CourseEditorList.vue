<script setup lang="ts">
import CourseEditorCard from './CourseEditorCard.vue'
import { courseNameForGame } from '~/shared/utils/course-names'
import type { Game } from '~/shared/schemas/game'
import type { CourseInput } from '~/composables/useSubmissionForm'

const props = defineProps<{
  modelValue: CourseInput[]
  /** The current game: for CS:GO, course names are derived from course order
   *  (`Main`, `Bonus 1`, `Bonus 2`, …) and never typed — `addCourse` appends
   *  the derived name and `removeCourse` re-derives the remaining names, so
   *  the convention holds after any add/remove. CS2 courses keep free names.
   *  The derivation rule lives in `courseNameForGame`.
   */
  game: Game
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CourseInput[]]
}>()

function updateCourse(index: number, value: CourseInput) {
  emit(
    'update:modelValue',
    props.modelValue.map((course, courseIndex) =>
      courseIndex === index ? value : course,
    ),
  )
}

function removeCourse(index: number) {
  // Re-derive the remaining names after the removal, so CS:GO names always
  // match the convention (a removed middle course shifts its successors down
  // — `Bonus 2` becomes `Bonus 1`, etc.); for CS2 the name stays unchanged.
  emit(
    'update:modelValue',
    props.modelValue
      .filter((_, i) => i !== index)
      .map((course, i) => ({
        ...course,
        name: courseNameForGame(props.game, i + 1, course.name),
      })),
  )
}

function addCourse() {
  const appended = {
    name: courseNameForGame(props.game, props.modelValue.length + 1, ''),
    image: null,
    mappers: [{ steamId64: '', displayName: '' }],
  }
  emit('update:modelValue', [...props.modelValue, appended])
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Courses</h2>
      <UButton
        variant="outline"
        label="Add Course"
        @click="addCourse"
      />
    </div>

    <div class="space-y-4">
      <CourseEditorCard
        v-for="(course, index) in modelValue"
        :key="`course-${index}`"
        :course="course"
        :index="index"
        :game="game"
        @update="updateCourse(index, $event)"
        @remove="removeCourse(index)"
      />
    </div>
  </section>
</template>
