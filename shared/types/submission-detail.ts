import type { ApprovalDecision, SubmissionStatus } from './submission'
import type { RejectionAttachment } from './attachment'
import type { CourseFilterState, CourseFilterTier, Mode } from '../schemas/cs2kz'

/**
 * Response shape of `GET /api/submissions/[id]` (see `server/queries/submission-details.ts`).
 * Timestamps arrive as ISO strings because the payload crosses HTTP/JSON.
 */

export interface SubmissionDetailMapper {
  id: string
  submissionId?: string
  courseId?: string
  steamId64: string
  displayNameSnapshot: string
}

export interface SubmissionDetailFinalFilter {
  id: string
  submissionId: string
  courseId: string
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  state: CourseFilterState
  isRanked: boolean
  notes: string | null
  resolvedByUserId: string
  resolvedAt: string
}

export interface SubmissionDetailVoteFilter {
  id: string
  voteId: string
  courseId: string
  mode: Mode
  nubTier: CourseFilterTier
  proTier: CourseFilterTier
  isRanked: boolean
  notes: string | null
}

export interface SubmissionDetailVote {
  id: string
  submissionId: string
  approverUserId: string
  approvalDecision: ApprovalDecision
  rejectionReason: string | null
  rejectionExplanation: string | null
  createdAt: string
  updatedAt: string
  approverName: string
  attachments: RejectionAttachment[]
  filters: SubmissionDetailVoteFilter[]
}

export interface SubmissionDetailCourse {
  id: string
  submissionId: string
  orderIndex: number
  name: string
  imageUrl: string
  imageMime: string
  imageWidth: number
  imageHeight: number
  imageSizeBytes: number
  createdAt: string
  updatedAt: string
  mappers: SubmissionDetailMapper[]
  finalFilters: SubmissionDetailFinalFilter[]
}

export interface SubmissionDetailSubmission {
  id: string
  createdByUserId: string
  workshopUrl: string
  workshopId: number
  mapName: string
  notes: string | null
  isPort: boolean
  portAuthorizationImageUrl: string | null
  portAuthorizationImageMime: string | null
  portAuthorizationImageWidth: number | null
  portAuthorizationImageHeight: number | null
  portAuthorizationImageSizeBytes: number | null
  portNotes: string | null
  status: SubmissionStatus
  decisionByUserId: string | null
  decisionNotes: string | null
  decisionByName: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SubmissionDetailResponse {
  submission: SubmissionDetailSubmission
  mappers: SubmissionDetailMapper[]
  courses: SubmissionDetailCourse[]
  votes: SubmissionDetailVote[]
  /** The lead approver's rejection attachments; populated for rejected
   *  finalizations and visible to every role — this is the only rejection
   *  material a mapper can ever see. */
  decisionAttachments: RejectionAttachment[]
}
