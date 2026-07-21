<script setup lang="ts">
import type { Mode } from '~/shared/schemas/cs2kz'
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

type Field = 'nubTier' | 'proTier' | 'isRanked' | 'notes'

const props = defineProps<{
  votes: SubmissionDetailVote[]
  currentUserId: string
  courseId: string
  mode: Mode
  field: Field
}>()

const open = shallowRef(false)

interface OtherEntry {
  approverName: string
  value: string | boolean | null
}

const others = computed<OtherEntry[]>(() => {
  const entries: OtherEntry[] = []
  for (const vote of props.votes) {
    if (vote.approverUserId === props.currentUserId) {
      continue
    }
    const filter = vote.filters.find(
      (item) => item.courseId === props.courseId && item.mode === props.mode,
    )
    if (!filter) {
      continue
    }
    const value = filter[props.field]
    if (props.field === 'notes' && (value === null || value === '')) {
      continue
    }
    entries.push({ approverName: vote.approverName, value })
  }
  return entries
})

function formatValue(value: OtherEntry['value']): string {
  if (props.field === 'isRanked') {
    return value ? 'Ranked' : 'Unranked'
  }
  if (value === null || value === '') {
    return '—'
  }
  return String(value)
}
</script>

<template>
  <div class="relative">
    <button
      v-if="others.length"
      type="button"
      class="secondary-button inline-flex items-center gap-1 px-2 py-1 text-xs"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3.5 w-3.5"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span>{{ others.length }}</span>
    </button>

    <ul
      v-if="open && others.length"
      class="mt-2 space-y-1 rounded-2xl border border-white/5 bg-black/30 p-3 text-sm text-zinc-300"
    >
      <li
        v-for="(entry, index) in others"
        :key="`${entry.approverName}-${index}`"
        class="flex gap-2"
      >
        <span class="text-muted">{{ entry.approverName }}</span>
        <span>{{ formatValue(entry.value) }}</span>
      </li>
    </ul>
  </div>
</template>
