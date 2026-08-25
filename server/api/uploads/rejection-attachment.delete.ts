import { createError, getQuery } from 'h3'

import {
  REJECTION_ATTACHMENT_PREFIX,
  isRejectionAttachmentKey,
  isUrlUnderPrefix,
  objectKeyFromStorageUrl,
  rejectionAttachmentDeleteQuerySchema,
} from '~/server/utils/attachment-rules'
import {
  deleteRejectionAttachmentObject,
  getBucketPublicBaseUrl,
} from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  // Any authenticated reviewer may remove a rejection-attachment object
  // (ownership is deliberately not enforced — internal-trust model).
  await requireReviewer(event)

  // The target URL travels in the QUERY STRING, not the request body: the
  // Cloudflare Pages runtime only forwards bodies for POST/PUT/PATCH, so a
  // DELETE with a body never reaches this handler (the body is dropped at the
  // worker entry and the empty body crashes workerd with a 1101).
  const { url } = rejectionAttachmentDeleteQuerySchema.parse(getQuery(event))
  const base = getBucketPublicBaseUrl()

  if (!isUrlUnderPrefix(url, base, REJECTION_ATTACHMENT_PREFIX)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only rejection-attachment objects can be deleted here',
    })
  }

  const key = objectKeyFromStorageUrl(url, base)
  if (!key || !isRejectionAttachmentKey(key)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only uploaded rejection-attachment objects can be deleted',
    })
  }

  await deleteRejectionAttachmentObject(url)

  return { ok: true }
})