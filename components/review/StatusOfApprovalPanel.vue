<script setup lang="ts">
import type { SubmissionDetailVote } from '~/shared/types/submission-detail'

import VoteSummaryPanel from './VoteSummaryPanel.vue'

/**
 * The Status of Approval section of the decided submission details page
 * (spec's item 4, ticket 04): the read-only rendition of the vote form's own
 * Status of Approval card, below the approver-votes section, for approvers
 * and the lead on approved/rejected submissions only.
 *
 * Every approver's Vote appears here — the viewer's own included; unlike the
 * pending review panels there is no self-exclusion, because the whole
 * decision record is the point. Yes votes carry the Approval note, no votes
 * the Rejection reason and any Rejection attachments (with the panel's
 * existing lightbox). The vote summary panel renders in its terminal mode:
 * a decided submission can legally carry zero Votes (a lead-only
 * finalization per ADR-0007), so the empty state reads as a settled page —
 * the pending-review wording ("no other approver votes yet") never appears
 * on a decided page. Mappers never see this section (the page gates it on
 * the approver roles, and the API strips the votes payload from
 * non-approvers); the server-side strip is the enforcement boundary.
 *
 * The section renders no Course mode at all — Vote cards carry the
 * approver's note/reason and Rejection attachments, never filter rows — so
 * it is game-agnostic by construction: votes on a CS:GO submission read
 * exactly like votes on a CS2 one, and the game's per-Course-mode history
 * lives entirely in the approver-votes section above.
 *
 * The card mirrors the vote form's layout — the label is a styled paragraph,
 * not a heading element, and there are no input controls of any kind.
 */
const props = defineProps<{
  votes: SubmissionDetailVote[]
}>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <p class="mb-2 text-xl font-semibold">Status of Approval:</p>
    <VoteSummaryPanel :votes="props.votes" terminal />
  </UCard>
</template>