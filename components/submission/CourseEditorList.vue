<script setup lang="ts">
import CourseEditorCard from './CourseEditorCard.vue'
import type { CourseInput } from '~/composables/useSubmissionForm'

const props = defineProps<{
  modelValue: CourseInput[]
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
  emit(
    'update:modelValue',
    props.modelValue.filter((_, courseIndex) => courseIndex !== index),
  )
}

function addCourse() {
  emit('update:modelValue', [
    ...props.modelValue,
    {
      name: '',
      image: null,
      mappers: [{ steamId64: '', displayName: '' }],
    },
  ])
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Courses</h2>
      <UButton
        variant="outline"
        icon="i-lucide-plus"
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
        @update="updateCourse(index, $event)"
        @remove="removeCourse(index)"
      />
    </div>
  </section>
</template>
