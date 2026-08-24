import type { RejectionAttachment } from '~/shared/types/attachment'
import { MAX_REJECTION_ATTACHMENT_BYTES } from '~/shared/schemas/attachment'

export const REJECTION_ATTACHMENT_PREFIX = 'rejection-attachments/'

// Re-exported so server code has one import site for the re-use limit.
export { MAX_REJECTION_ATTACHMENT_BYTES }

/** Server messages for each rejected attachment list, shared by the vote and
 *  decision save paths so the two services cannot drift. */
export const REJECTION_ATTACHMENT_MESSAGES: Record<
  RejectionAttachmentListRejectReason,
  string
> = {
  'attachments-not-allowed': 'Attachments are only allowed on a rejection',
  'reason-required': 'A written reason is required when attachments are provided',
  'duplicate-url': 'Duplicate attachment URLs are not allowed',
  'url-outside-prefix': 'Attachment URLs must point at uploaded rejection attachments',
}

/** Only keys this app itself generates (crypto.randomUUID + jpg/png) exist
 *  under the prefix; anything else is not a valid deletion target. Guards the
 *  delete endpoint against crafted keys (e.g. `..` traversal). */
export function isRejectionAttachmentKey(key: string): boolean {
  return /^rejection-attachments\/[0-9a-f-]{36}\.(jpg|png)$/.test(key)
}

/** Why an attachment list was rejected. Kept as a closed union so callers
 *  (and tests) can branch on the exact cause. */
export type RejectionAttachmentListRejectReason =
  | 'attachments-not-allowed'
  | 'reason-required'
  | 'duplicate-url'
  | 'url-outside-prefix'

export type RejectionAttachmentListVerdict =
  | { ok: true; attachments: RejectionAttachment[] }
  | { ok: false; reason: RejectionAttachmentListRejectReason }

function isEmptyReason(reason: string | null): boolean {
  return !reason || reason.trim().length === 0
}

/**
 * Pure business rule for what a reviewer may save alongside a rejection:
 *
 * - attachments are only valid when the decision is a rejection (`no` vote /
 *   `rejected` finalization) — an approval with attachments is invalid;
 * - a rejection with attachments also needs a non-empty written reason;
 * - URLs must not repeat and must live under the configured storage prefix
 *   (`<publicBaseUrl><allowedPrefix>`), so reviewers cannot inject arbitrary
 *   URLs into a rejection.
 *
 * The `attachments` array of an *accepted* verdict is guaranteed to satisfy
 * every rule above.
 */
export function assessRejectionAttachments(opts: {
  isRejection: boolean
  reason: string | null
  attachments: RejectionAttachment[]
  publicBaseUrl: string
  allowedPrefix: string
}): RejectionAttachmentListVerdict {
  const { isRejection, reason, attachments, publicBaseUrl, allowedPrefix } = opts

  if (!isRejection && attachments.length > 0) {
    return { ok: false, reason: 'attachments-not-allowed' }
  }

  if (isRejection && attachments.length > 0 && isEmptyReason(reason)) {
    return { ok: false, reason: 'reason-required' }
  }

  const seen = new Set<string>()
  for (const attachment of attachments) {
    if (seen.has(attachment.url)) {
      return { ok: false, reason: 'duplicate-url' }
    }
    seen.add(attachment.url)

    if (!isUrlUnderPrefix(attachment.url, publicBaseUrl, allowedPrefix)) {
      return { ok: false, reason: 'url-outside-prefix' }
    }
  }

  return { ok: true, attachments }
}

/** True when `url` starts with `<publicBaseUrl><prefix>`. */
export function isUrlUnderPrefix(
  url: string,
  publicBaseUrl: string,
  prefix: string,
): boolean {
  return url.startsWith(`${publicBaseUrl}${prefix}`)
}

/**
 * Extracts the object key (relative to the bucket root) from a public storage
 * URL, or `null` when the URL does not belong to this bucket. Used to turn a
 * validated attachment URL back into the key needed for deletion.
 */
export function objectKeyFromStorageUrl(
  url: string,
  publicBaseUrl: string,
): string | null {
  if (!url.startsWith(publicBaseUrl)) {
    return null
  }
  return url.slice(publicBaseUrl.length)
}

/**
 * Pure diff between the stored attachment set and the incoming one, matched
 * by URL. `removed` is what a save must delete from storage after replacing
 * the stored rows; `added` is what the incoming list contributes beyond what
 * is already stored; `kept` is the intersection.
 */
export function computeAttachmentReplacement(
  stored: RejectionAttachment[],
  incoming: RejectionAttachment[],
): {
  added: RejectionAttachment[]
  kept: RejectionAttachment[]
  removed: RejectionAttachment[]
} {
  const incomingUrls = new Set(incoming.map((attachment) => attachment.url))
  const storedUrls = new Set(stored.map((attachment) => attachment.url))

  return {
    added: incoming.filter((attachment) => !storedUrls.has(attachment.url)),
    kept: incoming.filter((attachment) => storedUrls.has(attachment.url)),
    removed: stored.filter((attachment) => !incomingUrls.has(attachment.url)),
  }
}

/** Maps stored DB rows (which carry extra columns and a plain-string mime)
 *  down to the shared shape. The mime narrowing is safe: every stored row was
 *  validated to be JPG or PNG on upload. */
export function toRejectionAttachments<
  T extends Pick<RejectionAttachment, 'url' | 'width' | 'height' | 'sizeBytes'> & { mime: string },
>(rows: T[]): RejectionAttachment[] {
  return rows.map((row) => ({
    url: row.url,
    mime: row.mime as RejectionAttachment['mime'],
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
  }))
}