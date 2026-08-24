/**
 * A single image attached to a rejection — either an approver's rejection
 * reason (visible to approvers/leads only) or the lead approver's rejection
 * (revealed to the mapper once the decision is finalized).
 *
 * Mirrors the image-upload meta shape returned by the upload endpoints and
 * stored by `submission_vote_attachments` / `submission_decision_attachments`.
 */
export interface RejectionAttachment {
  url: string
  mime: 'image/jpeg' | 'image/png'
  width: number
  height: number
  sizeBytes: number
}