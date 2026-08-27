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

/** The validated submission-content shape lives in the shared schema so the
 *  create and edit write paths consume one definition; the type is derived
 *  from it and re-exported here for importers of this module. */
export type { SubmissionInput } from '../schemas/submission'

/** Loose image-meta shape used by the client form state before validation
 *  (e.g. `mime` is a plain string because the form also holds unvalidated
 *  uploads). The stricter validated wire shape is defined in
 *  `shared/schemas/submission` — course images are fixed 1920×1080 JPG, port
 *  images are JPG/PNG with no fixed resolution. */
export interface CourseImageMeta {
  url: string
  mime: string
  width: number
  height: number
  sizeBytes: number
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
  courseCount: number
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
