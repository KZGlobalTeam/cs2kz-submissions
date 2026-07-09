<script setup lang="ts">
import SubmissionForm from '~/components/submission/SubmissionForm.vue'

definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <SubmissionForm />
</template>
