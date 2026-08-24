import { describe, expect, it } from 'vitest'

import { validateRejectionAttachment } from '~/server/utils/image-validation'

/** A real 1x1 transparent PNG. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** A minimal structurally-valid 1x1 JPEG (SOI + APP0 + SOF0 + EOI). */
const TINY_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x0f, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  0xff, 0xd9,
])

describe('validateRejectionAttachment', () => {
  it('accepts a readable PNG', () => {
    expect(validateRejectionAttachment(TINY_PNG, 'image/png')).toEqual({
      mimeType: 'image/png',
      width: 1,
      height: 1,
      sizeBytes: TINY_PNG.byteLength,
    })
  })

  it('accepts a readable JPEG', () => {
    expect(validateRejectionAttachment(TINY_JPEG, 'image/jpeg')).toEqual({
      mimeType: 'image/jpeg',
      width: 1,
      height: 1,
      sizeBytes: TINY_JPEG.byteLength,
    })
  })

  it('rejects a PNG disguised as a JPEG', () => {
    expect(() => validateRejectionAttachment(TINY_PNG, 'image/jpeg')).toThrowError(
      'Rejection attachment must be a JPG or PNG file',
    )
  })

  it('rejects an unsupported declared mime type', () => {
    expect(() => validateRejectionAttachment(TINY_PNG, 'image/gif')).toThrowError(
      'Rejection attachment must be a JPG or PNG file',
    )
  })

  it('rejects content that is not an image', () => {
    const garbage = Buffer.from('this is definitely not an image', 'utf8')
    expect(() => validateRejectionAttachment(garbage)).toThrowError(
      'Rejection attachment must be a JPG or PNG file',
    )
  })

  it('rejects files over the 10 MB cap', () => {
    const oversize = Buffer.concat([
      TINY_PNG,
      Buffer.alloc(10 * 1024 * 1024 + 1, 0),
    ])
    expect(() => validateRejectionAttachment(oversize, 'image/png')).toThrowError(
      'Rejection attachment must be smaller than 10 MB',
    )
  })

  it('accepts a file exactly at the 10 MB cap', () => {
    const atCap = Buffer.concat([
      TINY_PNG,
      Buffer.alloc(10 * 1024 * 1024 - TINY_PNG.byteLength, 0),
    ])
    const result = validateRejectionAttachment(atCap, 'image/png')
    expect(result.sizeBytes).toBe(10 * 1024 * 1024)
  })
})