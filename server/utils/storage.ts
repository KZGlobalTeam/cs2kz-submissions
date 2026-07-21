import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'

let client: SupabaseClient | null = null

export function getStorageConfig() {
  const supabaseUrl = process.env.NUXT_SUPABASE_URL
  const serviceRoleKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.NUXT_SUPABASE_STORAGE_BUCKET

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Storage is not configured',
    })
  }

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SUPABASE_SERVICE_ROLE_KEY must use a Supabase secret/service_role key, not a publishable key',
    })
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  }
}

function getStorageClient() {
  if (client) {
    return client
  }

  const config = getStorageConfig()
  client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return client
}

export async function uploadCourseImage(buffer: Buffer, mimeType: string) {
  const config = getStorageConfig()
  const key = `course-images/${randomUUID()}.jpg`

  const storage = getStorageClient().storage.from(config.bucket)
  const { error: uploadError } = await storage.upload(key, buffer, {
    contentType: mimeType,
    upsert: false,
  })

  if (uploadError) {
    throw createError({
      statusCode: 502,
      statusMessage: uploadError.message,
    })
  }

  const { data } = storage.getPublicUrl(key)
  if (!data.publicUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate public URL for uploaded image',
    })
  }

  return { key, url: data.publicUrl }
}
