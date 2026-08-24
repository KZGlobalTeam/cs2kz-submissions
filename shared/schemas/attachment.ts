import { z } from 'zod'

/** Per-file cap enforced server-side by `validateRejectionAttachment` and
 *  mirrored by the client upload guard. Keep in sync when this changes. */
export const MAX_REJECTION_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

/** Cross-stack shape for a single rejection attachment (upload response and
 *  vote/decision save payloads). The prefix/decision rules applied on top of
 *  this live in `server/utils/attachment-rules.ts`. */
export const RejectionAttachmentSchema = z.object({
  url: z.string().min(1),
  mime: z.enum(['image/jpeg', 'image/png']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().nonnegative(),
})

export type RejectionAttachmentInput = z.infer<typeof RejectionAttachmentSchema>