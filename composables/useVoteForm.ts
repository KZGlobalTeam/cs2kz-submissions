import { reactive } from 'vue'

export function useVoteForm() {
  const form = reactive({
    approvalDecision: 'yes' as 'yes' | 'no',
    rejectionReason: '',
    rejectionExplanation: '',
    filters: [] as Array<{
      courseId: string
      mode: 'classic' | 'vanilla'
      nubTier:
        | 'very-easy'
        | 'easy'
        | 'medium'
        | 'advanced'
        | 'hard'
        | 'very-hard'
        | 'extreme'
        | 'death'
        | 'unfeasible'
        | 'impossible'
      proTier:
        | 'very-easy'
        | 'easy'
        | 'medium'
        | 'advanced'
        | 'hard'
        | 'very-hard'
        | 'extreme'
        | 'death'
        | 'unfeasible'
        | 'impossible'
      isRanked: boolean
      notes: string
    }>,
  })

  return { form }
}
