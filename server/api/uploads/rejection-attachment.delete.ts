import { createError, readBody } from 'h3'
import { z } from 'zod'

import {
  REJECTION_ATTACHMENT_PREFIX,
  isRejectionAttachmentKey,
  isUrlUnderPrefix,
  objectKeyFromStorageUrl,
} from '~/server/utils/attachment-rules'
import {
  deleteRejectionAttachmentObject,
  getBucketPublicBaseUrl,
} from '~/server/utils/storage'

const bodySchema = z.object({
  url: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  // Any authenticated reviewer may remove a rejection-attachment object
  // (ownership is deliberately not enforced — internal-trust model).
  await requireReviewer(event)

  const body = bodySchema.parse(await readBody(event))
  const base = getBucketPublicBaseUrl()

  if (!isUrlUnderPrefix(body.url, base, REJECTION_ATTACHMENT_PREFIX)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only rejection-attachment objects can be deleted here',
    })
  }

  const key = objectKeyFromStorageUrl(body.url, base)
  if (!key || !isRejectionAttachmentKey(key)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only uploaded rejection-attachment objects can be deleted',
    })
  }

  await deleteRejectionAttachmentObject(body.url)

  return { ok: true }
})