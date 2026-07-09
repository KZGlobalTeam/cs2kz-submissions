import { describe, expect, it } from 'vitest'

import { validateCourseImage } from '~/server/utils/image-validation'

describe('image validation', () => {
  it('rejects invalid jpg buffers', () => {
    expect(() =>
      validateCourseImage(Buffer.from('hello'), 'image/jpeg'),
    ).toThrowError()
  })
})
