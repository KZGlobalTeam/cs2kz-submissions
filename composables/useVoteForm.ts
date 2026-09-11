import { reactive } from 'vue'

import type { RejectionAttachment } from '~/shared/types/attachment'
import type { CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
import type { ApprovalDecision } from '~/shared/types/submission'
import type { Game } from '~/shared/schemas/game'
import { modesForGame } from '~/shared/schemas/course-mode'

export interface VoteFormFilter {
  courseId: string
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  isRanked: boolean
  notes: string
  /** When false, the approver skips this filter: its fields are hidden and it
   *  is excluded from the submitted vote. Not persisted as a column — seeded
   *  from whether a matching filter exists in the prior vote (see seedFilters). */
  enabled: boolean
}

/** A previously-persisted vote used to prefill the form (notes is nullable on the wire). */
export interface ExistingVote {
  approvalDecision: ApprovalDecision
  rejectionReason: string | null
  approvalNote: string | null
  attachments: RejectionAttachment[]
  filters: Array<{
    courseId: string
    mode: Mode
    nubTier: CourseFilterTier
    proTier: CourseFilterTier
    isRanked: boolean
    notes: string | null
  }>
}

const DEFAULT_TIER: CourseFilterTier = 'very-easy'

/** The vote form seeds one filter row per Course per mode of the
 *  submission's game — CS2 rates classic/vanilla (CKZ/VNL), CS:GO rates
 *  kztimer/simplekz/vanilla (KZT/SKZ/VNL) — from the shared per-game
 *  vocabulary, so the two games' surfaces can never drift from the mode
 *  sets the write path validates against. */
function seedFilters(
  courses: Array<{ id: string }>,
  existing: ExistingVote | undefined,
  game: Game,
): VoteFormFilter[] {
  return courses.flatMap((course) =>
    modesForGame(game).map((mode) => {
      const match = existing?.filters.find(
        (filter) => filter.courseId === course.id && filter.mode === mode,
      )
      return {
        courseId: course.id,
        mode,
        nubTier: match?.nubTier ?? DEFAULT_TIER,
        proTier: match?.proTier ?? DEFAULT_TIER,
        isRanked: match?.isRanked ?? true,
        notes: match?.notes ?? '',
        enabled: match ? true : existing ? false : true,
      }
    }),
  )
}

export function useVoteForm(
  courses: Array<{ id: string }>,
  existing: ExistingVote | undefined,
  game: Game,
) {
  const form = reactive({
    approvalDecision: existing?.approvalDecision ?? ('yes' as ApprovalDecision),
    rejectionReason: existing?.rejectionReason ?? '',
    approvalNote: existing?.approvalNote ?? '',
    attachments: existing?.attachments ?? [],
    filters: seedFilters(courses, existing, game),
  })

  return { form }
}
