import { createError, readMultipartFormData } from 'h3'

import { validateRejectionAttachment } from '~/server/utils/image-validation'
import { uploadRejectionAttachment } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  // Approvers and lead approvers may attach images to rejection reasons;
  // mappers and other users cannot.
  await requireReviewer(event)

  const formData = await readMultipartFormData(event)
  const file = formData?.find((part) => part.type && part.data)

  if (!file?.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image file is required',
    })
  }

  const validated = validateRejectionAttachment(file.data, file.type)
  const uploaded = await uploadRejectionAttachment(file.data, validated.mimeType)

  return {
    url: uploaded.url,
    mime: validated.mimeType,
    width: validated.width,
    height: validated.height,
    sizeBytes: validated.sizeBytes,
  }
})