import { reactive } from 'vue'

import type { RejectionAttachment } from '~/shared/types/attachment'
import type { CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
import type { ApprovalDecision } from '~/shared/types/submission'

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
  rejectionExplanation: string | null
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

const DEFAULT_TIER: CourseFilterTier = 'medium'
const FILTER_MODES: Mode[] = ['classic', 'vanilla']

function seedFilters(
  courses: Array<{ id: string }>,
  existing?: ExistingVote,
): VoteFormFilter[] {
  return courses.flatMap((course) =>
    FILTER_MODES.map((mode) => {
      const match = existing?.filters.find(
        (filter) => filter.courseId === course.id && filter.mode === mode,
      )
      return {
        courseId: course.id,
        mode,
        nubTier: match?.nubTier ?? DEFAULT_TIER,
        proTier: match?.proTier ?? DEFAULT_TIER,
        isRanked: match?.isRanked ?? false,
        notes: match?.notes ?? '',
        enabled: match ? true : existing ? false : true,
      }
    }),
  )
}

export function useVoteForm(
  courses: Array<{ id: string }>,
  existing?: ExistingVote,
) {
  const form = reactive({
    approvalDecision: existing?.approvalDecision ?? ('yes' as ApprovalDecision),
    rejectionReason: existing?.rejectionReason ?? '',
    rejectionExplanation: existing?.rejectionExplanation ?? '',
    attachments: existing?.attachments ?? [],
    filters: seedFilters(courses, existing),
  })

  return { form }
}
