import { imageSize } from 'image-size'
import { createError } from 'h3'

const JPEG_MAGIC_BYTES = [
  [0xff, 0xd8, 0xff],
]

export interface ValidatedImage {
  mimeType: 'image/jpeg'
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
