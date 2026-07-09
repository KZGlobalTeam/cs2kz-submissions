<script setup lang="ts">
import CourseEditorCard from './CourseEditorCard.vue'

interface CourseInput {
  name: string
  image: {
    url: string
    mime: string
    width: number
    height: number
    sizeBytes: number
  } | null
  mappers: Array<{
    steamId64: string
    steamId: string
    displayName: string
  }>
}

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
      mappers: [{ steamId64: '', steamId: '', displayName: '' }],
    },
  ])
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">Courses</h2>
        <p class="text-sm text-muted">每张图至少要有一个 course。</p>
      </div>
      <button class="secondary-button text-sm" type="button" @click="addCourse">
        Add Course
      </button>
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
