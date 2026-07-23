import { imageSize } from 'image-size'
import { createError } from 'h3'

const JPEG_MAGIC_BYTES = [
  [0xff, 0xd8, 0xff],
]

const PNG_MAGIC_BYTES = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]

const MAX_AUTHORIZATION_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

export interface ValidatedImage {
  mimeType: 'image/jpeg'
  width: number
  height: number
  sizeBytes: number
}

export interface ValidatedAuthorizationImage {
  mimeType: 'image/jpeg' | 'image/png'
  width: number
  height: number
  sizeBytes: number
}

export function validateCourseImage(buffer: Buffer, mimeType?: string | null): ValidatedImage {
  const header = Array.from(buffer.slice(0, 3))
  const isJpegHeader = JPEG_MAGIC_BYTES.some((pattern) =>
    pattern.every((value, index) => header[index] === value),
  )

  if (!isJpegHeader || (mimeType && mimeType !== 'image/jpeg')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Course image must be a JPG file',
    })
  }

  const metadata = imageSize(buffer)
  if (metadata.type !== 'jpg' && metadata.type !== 'jpeg') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Course image must be a JPG file',
    })
  }

  if (metadata.width !== 1920 || metadata.height !== 1080) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Course image must be 1920x1080',
    })
  }

  return {
    mimeType: 'image/jpeg',
    width: metadata.width,
    height: metadata.height,
    sizeBytes: buffer.byteLength,
  }
}

/**
 * Validates a screenshot used as evidence that the original author of a
 * ported map authorized the port. Unlike course images, PNG is also accepted
 * and there is no fixed resolution — it just needs to be a readable image.
 */
export function validateAuthorizationImage(
  buffer: Buffer,
  mimeType?: string | null,
): ValidatedAuthorizationImage {
  if (buffer.byteLength > MAX_AUTHORIZATION_IMAGE_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization screenshot must be smaller than 10 MB',
    })
  }

  const header = Array.from(buffer.slice(0, 8))
  const isJpeg = JPEG_MAGIC_BYTES.some((pattern) =>
    pattern.every((value, index) => header[index] === value),
  )
  const isPng = PNG_MAGIC_BYTES.every((value, index) => header[index] === value)

  const declaredJpeg = !mimeType || mimeType === 'image/jpeg'
  const declaredPng = !mimeType || mimeType === 'image/png'

  if (isJpeg && declaredJpeg) {
    // fall through to metadata check below
  }
  else if (isPng && declaredPng) {
    // fall through to metadata check below
  }
  else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization screenshot must be a JPG or PNG file',
    })
  }

  const metadata = imageSize(buffer)
  if (
    metadata.type !== 'jpg' &&
    metadata.type !== 'jpeg' &&
    metadata.type !== 'png'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization screenshot must be a JPG or PNG file',
    })
  }

  if (!metadata.width || !metadata.height) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization screenshot has invalid dimensions',
    })
  }

  return {
    mimeType: metadata.type === 'png' ? 'image/png' : 'image/jpeg',
    width: metadata.width,
    height: metadata.height,
    sizeBytes: buffer.byteLength,
  }
}
