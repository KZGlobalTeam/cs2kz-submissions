<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import ReleaseForm from '~/components/release/ReleaseForm.vue'

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})

interface ReleaseRow {
  id: string
  name: string
  notes: string | null
}

const { data: releases, status, refresh } = await useAsyncData<ReleaseRow[]>(
  'releases',
  () => $fetch<ReleaseRow[]>('/api/releases'),
)

const columns: TableColumn<ReleaseRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'notes', header: 'Notes' },
  { id: 'actions', header: '' },
]

function openRelease(id: string) {
  return navigateTo(`/releases/${id}`)
}
</script>

<template>
  <div class="grid gap-6">
    <ReleaseForm @created="refresh" />

    <h1 class="text-2xl font-semibold">Releases</h1>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="releases ?? []"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #name-cell="{ row }">
          <UButton
            variant="ghost"
            color="neutral"
            class="px-0 font-medium"
            :label="row.original.name"
            @click="openRelease(row.original.id)"
          />
        </template>

        <template #notes-cell="{ row }">
          <span class="text-muted">{{ row.original.notes || '—' }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              size="xs"
              variant="outline"
              icon="i-lucide-arrow-right"
              @click="openRelease(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
