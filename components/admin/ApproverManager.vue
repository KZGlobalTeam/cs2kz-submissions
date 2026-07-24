<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { PaginatedResult } from '~/shared/types/pagination'

interface ApproverRow {
  steamId64: string
  displayName: string
  roles: ('approver' | 'lead_approver')[]
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
  { accessorKey: 'roles', header: 'Roles' },
  { id: 'actions', header: '' },
]

const removing = shallowRef<string | null>(null)
const pendingRemove = shallowRef<ApproverRow | null>(null)
const pendingRemoveRole = shallowRef<'approver' | 'lead_approver' | null>(null)

function startRemove(row: ApproverRow, role: 'approver' | 'lead_approver') {
  pendingRemove.value = row
  pendingRemoveRole.value = role
}

async function confirmRemoveApprover() {
  const item = pendingRemove.value
  const role = pendingRemoveRole.value
  if (!item || !role) {
    return
  }

  removing.value = `${item.steamId64}-${role}`
  try {
    await $fetch(
      `/api/admin/approvers/${item.steamId64}?role=${role}`,
      { method: 'DELETE' },
    )
    await refresh()
    // If we emptied the current page, step back.
    if (items.value.length === 0 && page.value > 1) {
      page.value = page.value - 1
    }
  } finally {
    removing.value = null
    pendingRemove.value = null
    pendingRemoveRole.value = null
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
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="role in [...row.original.roles].sort((a, b) => (a === 'lead_approver' ? 0 : 1) - (b === 'lead_approver' ? 0 : 1))"
              :key="role"
              :color="roleColor(role)"
              :label="role"
              variant="subtle"
            />
          </div>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex flex-wrap justify-end gap-2">
            <UButton
              v-for="role in row.original.roles"
              :key="role"
              variant="ghost"
              color="error"
              :label="`Remove ${role}`"
              :loading="removing === `${row.original.steamId64}-${role}`"
              @click="startRemove(row.original, role)"
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

    <CommonConfirmDialog
      :open="pendingRemove !== null"
      title="Remove approver"
      :description="pendingRemove && pendingRemoveRole ? `Remove ${pendingRemove.displayName} (${pendingRemoveRole}) from the approver list?` : undefined"
      confirm-label="Remove"
      confirm-color="error"
      :loading="removing !== null"
      @confirm="confirmRemoveApprover"
      @cancel="pendingRemove = null; pendingRemoveRole = null"
      @update:open="(value) => { if (!value) { pendingRemove = null; pendingRemoveRole = null } }"
    />
  </section>
</template>
