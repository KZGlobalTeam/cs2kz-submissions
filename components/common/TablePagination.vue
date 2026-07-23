<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/shared/types/pagination'

const props = withDefaults(
  defineProps<{
    page: number
    pageSize: number
    total: number
    pageSizeOptions?: readonly number[]
  }>(),
  {
    pageSizeOptions: () => PAGE_SIZE_OPTIONS,
  },
)

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const sizeItems = computed(() =>
  props.pageSizeOptions.map(value => ({ label: String(value), value })),
)

const rangeText = computed(() => {
  const start = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
  const end = Math.min(props.page * props.pageSize, props.total)
  return `${start}–${end} of ${props.total}`
})

function onPage(value: number) {
  emit('update:page', value)
}

function onPageSize(value: { label: string, value: number } | number) {
  const next = typeof value === 'number' ? value : value.value
  emit('update:pageSize', next)
  emit('update:page', 1)
}
</script>

<template>
  <div
    v-if="total > 0"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-4 py-3"
  >
    <span class="text-sm text-muted">{{ rangeText }}</span>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted">Per page</span>
        <USelect
          :model-value="pageSize"
          :items="sizeItems"
          value-key="value"
          class="w-20"
          @update:model-value="onPageSize"
        />
      </div>
      <UPagination
        :page="page"
        :items-per-page="pageSize"
        :total="total"
        @update:page="onPage"
      />
    </div>
  </div>
</template>
