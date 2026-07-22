<script setup lang="ts">
import { tierToNumber } from '~/shared/schemas/cs2kz'
import type { CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

type Field = 'nubTier' | 'proTier' | 'isRanked' | 'notes'

const props = defineProps<{
  votes: SubmissionDetailVote[]
  currentUserId: string
  courseId: string
  mode: Mode
  field: Field
  orientation?: 'horizontal' | 'vertical'
}>()

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

function badgeColor(value: OtherEntry['value']) {
  if (props.field === 'isRanked') {
    return value ? 'success' : 'neutral'
  }
  return 'neutral'
}

function badgeLabel(value: OtherEntry['value']) {
  if (props.field === 'nubTier' || props.field === 'proTier') {
    return String(tierToNumber(value as CourseFilterTier))
  }
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
  <div
    v-if="others.length"
    class="flex gap-1.5"
    :class="props.orientation === 'vertical' ? 'flex-col' : 'flex-wrap'"
  >
    <UBadge
      v-for="(entry, index) in others"
      :key="`${entry.approverName}-${index}`"
      :color="badgeColor(entry.value)"
      variant="subtle"
      class="gap-1"
    >
      <span class="text-muted">{{ entry.approverName }}:</span>
      <span class="font-medium">{{ badgeLabel(entry.value) }}</span>
    </UBadge>
  </div>
</template>
