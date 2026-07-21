import { afterEach, describe, expect, it } from 'vitest'

import { getStorageConfig } from '~/server/utils/storage'

const originalEnv = {
  NUXT_SUPABASE_URL: process.env.NUXT_SUPABASE_URL,
  NUXT_SUPABASE_SERVICE_ROLE_KEY: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
  NUXT_SUPABASE_STORAGE_BUCKET: process.env.NUXT_SUPABASE_STORAGE_BUCKET,
}

afterEach(() => {
  process.env.NUXT_SUPABASE_URL = originalEnv.NUXT_SUPABASE_URL
  process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY = originalEnv.NUXT_SUPABASE_SERVICE_ROLE_KEY
  process.env.NUXT_SUPABASE_STORAGE_BUCKET = originalEnv.NUXT_SUPABASE_STORAGE_BUCKET
})

describe('storage config', () => {
  it('rejects publishable keys in the service role env var', () => {
    process.env.NUXT_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY = 'sb_publishable_example'
    process.env.NUXT_SUPABASE_STORAGE_BUCKET = 'course-images'

    expect(() => getStorageConfig()).toThrowError(
      'NUXT_SUPABASE_SERVICE_ROLE_KEY must use a Supabase secret/service_role key, not a publishable key',
    )
  })
})
