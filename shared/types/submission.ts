import type { UserRole } from './roles'
import type { RejectionAttachment } from './attachment'
import type {
  CourseFilterState,
  CourseFilterTier,
  MapState,
  Mode,
} from '../schemas/cs2kz'

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalDecision = 'yes' | 'no'

export interface SteamMapperInput {
  steamId64: string
  displayName: string
}

export interface CourseImageMeta {
  url: string
  mime: string
  width: number
  height: number
  sizeBytes: number
}

export interface SubmissionCourseInput {
  name: string
  image: CourseImageMeta
  mappers: SteamMapperInput[]
}

export interface SubmissionInput {
  workshopUrl: string
  mapName: string
  notes: string | null
  isPort: boolean
  portAuthorizationImage: CourseImageMeta | null
  portNotes: string | null
  mappers: SteamMapperInput[]
  courses: SubmissionCourseInput[]
}

export interface FilterVoteInput {
  courseId: string
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  isRanked: boolean
  notes: string | null
}

export interface SubmissionVoteInput {
  approvalDecision: ApprovalDecision
  rejectionReason: string | null
  rejectionExplanation: string | null
  /** Only valid on a `no` vote, alongside a non-empty rejectionReason. */
  attachments: RejectionAttachment[]
  filters: FilterVoteInput[]
}

export interface FinalFilterInput extends FilterVoteInput {
  state: CourseFilterState
}

export interface LeadDecisionInput {
  status: SubmissionStatus
  decisionNotes: string | null
  /** Only valid when status is `rejected`; written once at finalize time. */
  attachments: RejectionAttachment[]
  filters: FinalFilterInput[]
}

export interface ReleaseExportMap {
  workshop_id: number
  description: string | null
  state: MapState
  mappers: string[]
  courses: Array<{
    name: string
    description: string | null
    mappers: string[]
    filters: {
      classic: {
        nub_tier: CourseFilterTier
        pro_tier: CourseFilterTier
        state: CourseFilterState
        notes: string | null
      }
      vanilla: {
        nub_tier: CourseFilterTier
        pro_tier: CourseFilterTier
        state: CourseFilterState
        notes: string | null
      }
    }
  }>
}

export interface ReviewSubmissionRow {
  id: string
  mapName: string
  workshopId: number
  workshopUrl: string
  submittedBy: string
  status: SubmissionStatus
  createdAt: string
  approvedAt: string | null
  mappers: string[]
  yesVotes: number
  noVotes: number
  myVote: ApprovalDecision | null
}

export interface SessionUser {
  id: string
  steamId64: string
  name: string
  avatarUrl: string | null
  profileUrl: string | null
  roles: UserRole[]
}
