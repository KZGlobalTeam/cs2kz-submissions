import { reactive } from 'vue'

import type { CourseFilterTier, Mode } from '~/shared/schemas/cs2kz'
import type { ApprovalDecision } from '~/shared/types/submission'

export interface VoteFormFilter {
  courseId: string
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  isRanked: boolean
  notes: string
}

/** A previously-persisted vote used to prefill the form (notes is nullable on the wire). */
export interface ExistingVote {
  approvalDecision: ApprovalDecision
  rejectionReason: string | null
  rejectionExplanation: string | null
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
    filters: seedFilters(courses, existing),
  })

  return { form }
}
