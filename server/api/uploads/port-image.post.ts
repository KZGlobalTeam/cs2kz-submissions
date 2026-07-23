import { createError, readMultipartFormData } from 'h3'

import { requireAuth } from '~/server/utils/permissions'
import { uploadPortImage } from '~/server/utils/storage'
import { validateAuthorizationImage } from '~/server/utils/image-validation'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const formData = await readMultipartFormData(event)
  const file = formData?.find((part) => part.type && part.data)

  if (!file?.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image file is required',
    })
  }

  const validated = validateAuthorizationImage(file.data, file.type)
  const uploaded = await uploadPortImage(file.data, validated.mimeType)

  return {
    url: uploaded.url,
    mime: validated.mimeType,
    width: validated.width,
    height: validated.height,
    sizeBytes: validated.sizeBytes,
  }
})
