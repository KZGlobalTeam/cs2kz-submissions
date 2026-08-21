<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaginatedResult } from '~/shared/types/pagination'

definePageMeta({
  middleware: ['auth', 'lead-approver'],
})

interface ReleaseRow {
  id: string
  name: string
  notes: string | null
  mapCount: number
  createdAt: string
}

const toast = useToast()
const {
  exporting,
  exportOpen,
  exportJson,
  exportTitle,
  exportRelease,
  closeExport,
} = useReleaseExport()
const copied = ref(false)

/**
 * Legacy synchronous clipboard write (textarea + execCommand). Only used as a
 * fallback when the modern Clipboard API is unavailable or rejected — its
 * return value is not a reliable guarantee that the system clipboard was
 * updated in every environment.
 */
function copyWithFallback(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  textarea.remove()
  return ok
}

async function copyExport() {
  if (!exportJson.value) return
  const text = exportJson.value

  // Primary: async Clipboard API. Its promise only resolves once the system
  // clipboard has actually been updated, and it works in secure contexts
  // (localhost + the deployed https site) within the click's user activation.
  let ok = false
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      ok = false
    }
  }

  // Fallback: legacy synchronous write for non-secure contexts or when the
  // async API is blocked (e.g. denied permission, sandboxed iframe).
  if (!ok) {
    ok = copyWithFallback(text)
  }

  if (ok) {
    copied.value = true
    toast.add({ color: 'success', title: 'JSON copied to clipboard' })
    setTimeout(() => (copied.value = false), 2000)
  } else {
    toast.add({ color: 'error', title: 'Failed to copy JSON' })
  }
}

const { items, total, page, pageSize, status, refresh } = usePaginatedTable<ReleaseRow>(
  'releases',
  ({ page, pageSize }) =>
    $fetch<PaginatedResult<ReleaseRow>>('/api/releases', {
      params: { page, pageSize },
    }),
)

const columns: TableColumn<ReleaseRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'notes', header: 'Notes' },
  { accessorKey: 'mapCount', header: 'Maps' },
  { accessorKey: 'createdAt', header: 'Created' },
  { id: 'actions', header: '' },
]

const removing = shallowRef<string | null>(null)
const pendingDelete = shallowRef<ReleaseRow | null>(null)

function openRelease(id: string) {
  return navigateTo(`/releases/${id}`)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

async function confirmDeleteRelease() {
  const row = pendingDelete.value
  if (!row) {
    return
  }

  removing.value = row.id
  try {
    await $fetch(`/api/releases/${row.id}`, { method: 'DELETE' })
    toast.add({ color: 'success', title: 'Release deleted' })
    await refresh()
    // If we emptied the current page (e.g. deleted the last row), step back.
    if (items.value.length === 0 && page.value > 1) {
      page.value = page.value - 1
    }
  } finally {
    removing.value = null
    pendingDelete.value = null
  }
}
</script>

<template>
  <div class="grid gap-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">Releases</h1>
      <div class="flex items-center gap-2">
        <UButton
          label="Refresh"
          variant="outline"
          color="neutral"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
        <UButton
          label="New Release"
          @click="navigateTo('/releases/new')"
        />
      </div>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #name-cell="{ row }">
          <UButton
            variant="ghost"
            color="neutral"
            class="-mx-1 px-1 font-medium"
            :label="row.original.name"
            @click="openRelease(row.original.id)"
          />
        </template>

        <template #notes-cell="{ row }">
          <span class="text-muted">{{ row.original.notes || '—' }}</span>
        </template>

        <template #mapCount-cell="{ row }">
          <span class="text-muted">{{ row.original.mapCount }}</span>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{ formatDate(row.original.createdAt) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              label="Export JSON"
              :loading="exporting"
              @click="exportRelease(row.original.id, row.original.name)"
            />
            <UButton
              variant="ghost"
              color="error"
              label="Delete"
              :loading="removing === row.original.id"
              @click="pendingDelete = row.original"
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

    <UModal
      v-model:open="exportOpen"
      :title="exportTitle"
      :close="false"
    >
      <template #body>
        <pre class="max-h-[60vh] overflow-auto rounded-md bg-elevated p-3 text-xs leading-relaxed text-muted">{{ exportJson }}</pre>
      </template>

      <template #footer>
        <div class="flex flex-1 justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            label="Close"
            @click="closeExport"
          />
          <UButton
            :label="copied ? 'Copied' : 'Copy'"
            :color="copied ? 'success' : 'primary'"
            :icon="copied ? 'i-lucide-check' : undefined"
            @click="copyExport"
          />
        </div>
      </template>
    </UModal>

    <CommonConfirmDialog
      :open="pendingDelete !== null"
      title="Delete release"
      :description="pendingDelete ? `Delete “${pendingDelete.name}”? This cannot be undone.` : undefined"
      confirm-label="Delete"
      confirm-color="error"
      :loading="removing !== null"
      @confirm="confirmDeleteRelease"
      @cancel="pendingDelete = null"
      @update:open="(value) => { if (!value) pendingDelete = null }"
    />
  </div>
</template>
