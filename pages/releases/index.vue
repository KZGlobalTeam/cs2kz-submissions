<script setup lang="ts">
import ReleaseForm from '~/components/release/ReleaseForm.vue'

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})

const { data: releases, refresh } = await useAsyncData('releases', () =>
  $fetch('/api/releases'),
)
</script>

<template>
  <div class="grid gap-6">
    <ReleaseForm @created="refresh" />

    <section class="grid gap-4">
      <NuxtLink
        v-for="release in releases ?? []"
        :key="release.id"
        :to="`/releases/${release.id}`"
        class="panel block rounded-[1.5rem] p-5 transition hover:border-accent/30"
      >
        <h2 class="text-xl font-semibold">{{ release.name }}</h2>
        <p class="mt-2 text-sm text-muted">{{ release.notes || 'No notes' }}</p>
      </NuxtLink>
    </section>
  </div>
</template>
