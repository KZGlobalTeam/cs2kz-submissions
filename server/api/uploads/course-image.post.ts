import { createError, readMultipartFormData } from 'h3'

import { requireAuth } from '~/server/utils/permissions'
import { uploadCourseImage } from '~/server/utils/storage'
import { validateCourseImage } from '~/server/utils/image-validation'

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

  const validated = validateCourseImage(file.data, file.type)
  const uploaded = await uploadCourseImage(file.data, validated.mimeType)

  return {
    url: uploaded.url,
    mime: validated.mimeType,
    width: validated.width,
    height: validated.height,
    sizeBytes: validated.sizeBytes,
  }
})
