<script setup lang="ts">
import ApproverManager from '~/components/admin/ApproverManager.vue'

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})
</script>

<template>
  <ApproverManager />
</template>
