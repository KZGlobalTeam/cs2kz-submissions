import type { UserRole } from './roles'
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
  steamId: string
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
  filters: FilterVoteInput[]
}

export interface FinalFilterInput extends FilterVoteInput {
  state: CourseFilterState
}

export interface LeadDecisionInput {
  status: SubmissionStatus
  decisionNotes: string | null
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

export interface SessionUser {
  id: string
  steamId64: string
  steamId: string
  name: string
  avatarUrl: string | null
  profileUrl: string | null
  roles: UserRole[]
}
