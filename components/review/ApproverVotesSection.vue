<script setup lang="ts">
import type { SubmissionDetailCourse, SubmissionDetailVote } from '~/shared/types/submission-detail'
import type { Game } from '~/shared/schemas/game'
import { modeLabel } from '~/shared/schemas/course-mode'

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
 * filter. Every badge carries an explicit color — none inherits the theme
 * default: the NUB tier, PRO tier, and Reasoning entry badges are `neutral`
 * (the same quiet color the vote form's other-approver votes show for those
 * fields), the Ranked Status entries keep `success` for Ranked and
 * `neutral` for Unranked, and each Final reference badge is marked by the
 * word `Final:` in the site's accent blue — `neutral` (or the settled
 * value's rank color on Ranked Status), not by a loud badge color. The
 * Reasoning row renders no Final badge at all: proposals only, since the
 * display model never derives a reasoning settlement (issue 01).
 *
 * The Course-mode blocks follow the submission's own game's vocabulary
 * (the `game` prop the page passes from the detail payload's row — the
 * row is truth): a decided CS:GO submission shows KZT, SKZ, and VNL
 * blocks per course, CS2 shows CKZ and VNL exactly as today.
 *
 * There are no headings (course names and mode labels render as styled
 * paragraphs, not heading elements) and no input controls of any kind: no
 * checkbox, radio group, select, or textarea.
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
  /** The submission's game — the page passes the value from the detail
   *  payload's own row, so the section renders the game's own mode
   *  blocks. */
  game: Game
}>()

const view = computed(() => buildApproverVotesView(props.courses, props.votes, props.game))
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
                  :color="mode.rankedStatus.final.displayValue === 'Ranked' ? 'success' : 'neutral'"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-accent">{{ mode.rankedStatus.final.approverName }}:</span>
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
                  color="neutral"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
                <UBadge
                  v-if="mode.nubTier.final"
                  color="neutral"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-accent">{{ mode.nubTier.final.approverName }}:</span>
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
                  color="neutral"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
                <UBadge
                  v-if="mode.proTier.final"
                  color="neutral"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-accent">{{ mode.proTier.final.approverName }}:</span>
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
                  color="neutral"
                  variant="subtle"
                  class="gap-1"
                >
                  <span class="text-muted">{{ entry.approverName }}:</span>
                  <span class="font-medium">{{ entry.displayValue }}</span>
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>