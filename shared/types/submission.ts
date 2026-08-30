import type { UserRole } from './roles'
import type {
  CourseFilterState,
  CourseFilterTier,
  MapState,
} from '../schemas/cs2kz'

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalDecision = 'yes' | 'no'

/** The validated submission-content shape lives in the shared schema so the
 *  create and edit write paths consume one definition; the type is derived
 *  from it and re-exported here for importers of this module. */
export type { SubmissionInput } from '../schemas/submission'

/** The validated Vote and Decision write shapes live in the shared schemas so
 *  both write endpoints and both services consume one definition; the input
 *  types are inferred from them and re-exported here for importers of this
 *  module. */
export type {
  SubmissionVoteInput,
  VoteFilterInput,
  LeadDecisionInput,
  FinalFilterInput,
} from '../schemas/review'

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
  name: string
  avatarUrl: string | null
  profileUrl: string | null
  roles: UserRole[]
}
