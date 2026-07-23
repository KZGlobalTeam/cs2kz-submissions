<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { PaginatedResult } from '~/shared/types/pagination'

interface ApproverRow {
  steamId64: string
  displayName: string
  role: 'approver' | 'lead_approver'
}

const { items, total, page, pageSize, status, refresh } = usePaginatedTable<ApproverRow>(
  'approvers',
  ({ page, pageSize }) =>
    $fetch<PaginatedResult<ApproverRow>>('/api/admin/approvers', {
      params: { page, pageSize },
    }),
)

const schema = z.object({
  steamId64: z.string().min(1, 'SteamID64 is required'),
  role: z.enum(['approver', 'lead_approver']),
})
type Schema = z.output<typeof schema>

const form = reactive({
  steamId64: '',
  role: 'approver' as 'approver' | 'lead_approver',
})

const roleOptions = [
  { label: 'Approver', value: 'approver' },
  { label: 'Lead Approver', value: 'lead_approver' },
]

const creating = shallowRef(false)

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  creating.value = true
  try {
    await $fetch('/api/admin/approvers', {
      method: 'POST',
      body: { steamId64: form.steamId64, role: form.role },
    })
    form.steamId64 = ''
    await refresh()
  } finally {
    creating.value = false
  }
}

const columns: TableColumn<ApproverRow>[] = [
  { accessorKey: 'displayName', header: 'Name' },
  { accessorKey: 'steamId64', header: 'SteamID64' },
  { accessorKey: 'role', header: 'Role' },
  { id: 'actions', header: '' },
]

const removing = shallowRef<string | null>(null)

async function removeApprover(item: ApproverRow) {
  removing.value = `${item.steamId64}-${item.role}`
  try {
    await $fetch(
      `/api/admin/approvers/${item.steamId64}?role=${item.role}`,
      { method: 'DELETE' },
    )
    await refresh()
    // If we emptied the current page, step back.
    if (items.value.length === 0 && page.value > 1) {
      page.value = page.value - 1
    }
  } finally {
    removing.value = null
  }
}

const roleColor = (role: string) =>
  role === 'lead_approver' ? 'warning' : 'neutral'
</script>

<template>
  <section class="grid gap-6">
    <UCard>
      <h2 class="mb-4 text-lg font-semibold">Add Approver</h2>
      <UForm :state="form" :schema="schema" class="grid gap-4 lg:grid-cols-[1fr_200px_auto] lg:items-end" @submit="onSubmit">
        <UFormField label="SteamID64" name="steamId64" required>
          <UInput v-model="form.steamId64" placeholder="76561198…" class="w-full" />
        </UFormField>
        <UFormField label="Role" name="role" required>
          <USelect v-model="form.role" :items="roleOptions" value-key="value" class="w-full" />
        </UFormField>
        <UButton type="submit" label="Save" :loading="creating" />
      </UForm>
    </UCard>

    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">Approvers</h1>
      <UButton
        label="Refresh"
        variant="outline"
        color="neutral"
        :loading="status === 'pending'"
        @click="() => refresh()"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="items" :columns="columns" :loading="status === 'pending'">
        <template #role-cell="{ row }">
          <UBadge :color="roleColor(row.original.role)" :label="row.original.role" variant="subtle" />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              variant="ghost"
              color="error"
              label="Remove"
              :loading="removing === `${row.original.steamId64}-${row.original.role}`"
              @click="removeApprover(row.original)"
            />
          </div>
        </template>
      </UTable>

      <CommonTablePagination
        :page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="page = $event"
        @update:page-size="pageSize = $event"
      />
    </UCard>
  </section>
</template>
