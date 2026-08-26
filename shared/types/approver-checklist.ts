import type {
  ApproverChecklist,
  ApproverChecklistInput,
} from '../schemas/approver-checklist'

export type { ApproverChecklist, ApproverChecklistInput }

/**
 * One saved Approver checklist row as returned by
 * `GET`/`PUT /api/submissions/[id]/approver-checklist`. Timestamps arrive as
 * ISO strings because the payload crosses HTTP/JSON. `GET` returns `null`
 * when the caller never saved anything — a reset-to-nothing save returns a
 * real row instead, so the two states stay distinguishable.
 */
export interface ApproverChecklistRow {
  checklist: ApproverChecklist
  note: string | null
  createdAt: string
  updatedAt: string
}