<script setup lang="ts">
import type { Mode } from '~/shared/schemas/cs2kz'
import type { SubmissionDetailCourse, SubmissionDetailVote } from '~/shared/types/submission-detail'
import type { ReasoningDisplay } from '~/shared/utils/approver-votes-view'

import { buildApproverVotesView } from '~/shared/utils/approver-votes-view'

/**
 * The approver-votes section of the decided submission details page
 * (spec's item 3, ticket 03): a read-only, per-Course rendition of the vote
 * form for approvers and the lead on approved/rejected submissions only.
 *
 * The layout follows the vote form — one card per Course (name, image),
 * then per Course mode the four fields as static labels — but every input
 * control is replaced by a badge per approver (`Name: value`) plus one
 * "Final" reference badge per field derived from the Course's Finalized
 * filter. There are no headings (course names and mode labels render as
 * styled paragraphs, not heading elements) and no input controls of any
 * kind: no checkbox, radio group, select, or textarea.
 *
 * The displayed structure is the pure view-model derived by
 * `buildApproverVotesView` — this component only renders it. Mappers never
 * see this section (the page gates it on the approver roles, and the API
 * strips the votes payload from non-approvers); the server-side strip is the
 * enforcement boundary, so an empty `votes` prop must never be the sole
 * guard — the page branches on roles, not on vote count.
 */
const props = defineProps<{
  courses: SubmissionDetailCourse[]
  votes: SubmissionDetailVote[]
}>()

const view = computed(() => buildApproverVotesView(props.courses, props.votes))

function modeLabel(mode: Mode): string {
  return mode === 'classic' ? 'CKZ' : 'VNL'
}

/** A missing reasoning value (the lead finalized the filter without written
 *  notes) renders as an em dash, like OtherApproverVotes' placeholder. */
function reasoningText(value: ReasoningDisplay): string {
  return value === null ? '—' : value
}
</script>

<template>
  <div class="space-y-6">
    <UCard
      v-for="course in view.courses"
      :key="course.courseId"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <p class="mb-4 text-xl font-semibold">{{ course.courseName }}</p>
      <img
        :src="course.courseImageUrl"
        :alt="course.courseName"
        class="h-40 w-auto max-w-full rounded-md object-contain"
      >

      <div class="mt-6 space-y-6 border-t border-white/5 pt-6">
        <div
          v-for="mode in course.modes"
          :key="mode.mode"
          class="border-t border-white/5 pt-6 first:border-t-0 first:pt-0"
        >
          <p class="mb-4 text-base font-semibold">
            {{ modeLabel(mode.mode) }} Filter
          </p>

          <div class="space-y-3">
            <!-- Ranked Status -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">Ranked Status:</span>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="(entry, index) in mode.rankedStatus.entries"
                  :key="`${entry.approverName}-${index}`"
                  :color="entry.displayValue === 'Ranked' ? 'success' : 'neutral'"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
                <UBadge
                  v-if="mode.rankedStatus.final"
                  color="primary"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ mode.rankedStatus.final.approverName }}:</span>
                  <span class="font-medium">{{ mode.rankedStatus.final.displayValue }}</span>
                </UBadge>
              </div>
            </div>

            <!-- NUB Tier -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">NUB Tier:</span>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="(entry, index) in mode.nubTier.entries"
                  :key="`${entry.approverName}-${index}`"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
                <UBadge
                  v-if="mode.nubTier.final"
                  color="primary"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ mode.nubTier.final.approverName }}:</span>
                  <span class="font-medium">{{ mode.nubTier.final.displayValue }}</span>
                </UBadge>
              </div>
            </div>

            <!-- PRO Tier -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">PRO Tier:</span>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="(entry, index) in mode.proTier.entries"
                  :key="`${entry.approverName}-${index}`"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
                <UBadge
                  v-if="mode.proTier.final"
                  color="primary"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ mode.proTier.final.approverName }}:</span>
                  <span class="font-medium">{{ mode.proTier.final.displayValue }}</span>
                </UBadge>
              </div>
            </div>

            <!-- Reasoning -->
            <div>
              <span class="text-sm text-muted">Reasoning for Tier:</span>
              <div class="mt-2 flex flex-col gap-1.5">
                <UBadge
                  v-for="(entry, index) in mode.reasoning.entries"
                  :key="`${entry.approverName}-${index}`"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
                <UBadge
                  v-if="mode.reasoning.final"
                  color="primary"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ mode.reasoning.final.approverName }}:</span>
                  <span class="font-medium">{{ reasoningText(mode.reasoning.final.displayValue) }}</span>
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>