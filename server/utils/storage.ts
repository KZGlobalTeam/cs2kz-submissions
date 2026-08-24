import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'

import { REJECTION_ATTACHMENT_PREFIX, objectKeyFromStorageUrl } from './attachment-rules'
import { getAppConfig } from './config'

let client: SupabaseClient | null = null

export function getStorageConfig() {
  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = getAppConfig()

  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseStorageBucket) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase Storage is not configured',
    })
  }

  if (String(supabaseServiceRoleKey).startsWith('sb_publishable_')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SUPABASE_SERVICE_ROLE_KEY must use a Supabase secret/service_role key, not a publishable key',
    })
  }

  return {
    supabaseUrl: String(supabaseUrl),
    serviceRoleKey: String(supabaseServiceRoleKey),
    bucket: String(supabaseStorageBucket),
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

export function getBucketPublicBaseUrl(): string {
  const { supabaseUrl, bucket } = getStorageConfig()
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/`
}

/** Shared upload path: key under `prefix`, public URL generation, unified
 *  error mapping. Used by course, port-authorization, and rejection-upload
 *  images. */
async function uploadToBucket(prefix: string, buffer: Buffer, mimeType: string) {
  const config = getStorageConfig()
  const extension = mimeType === 'image/png' ? 'png' : 'jpg'
  const key = `${prefix}${crypto.randomUUID()}.${extension}`

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

export async function uploadCourseImage(buffer: Buffer, mimeType: string) {
  return uploadToBucket('course-images/', buffer, mimeType)
}

export async function uploadPortImage(buffer: Buffer, mimeType: string) {
  return uploadToBucket('port-images/', buffer, mimeType)
}

export async function uploadRejectionAttachment(buffer: Buffer, mimeType: string) {
  return uploadToBucket(REJECTION_ATTACHMENT_PREFIX, buffer, mimeType)
}

/** Removes a single rejection-attachment object by its public URL. Throws on
 *  a URL outside this bucket or a storage failure. */
export async function deleteRejectionAttachmentObject(url: string) {
  const config = getStorageConfig()
  const key = objectKeyFromStorageUrl(url, getBucketPublicBaseUrl())

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Attachment URL is not in this storage bucket',
    })
  }

  const { error } = await getStorageClient().storage.from(config.bucket).remove([key])
  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error.message,
    })
  }
}

/** Best-effort removal of many objects (used post-transaction by save paths,
 *  where the rows are already committed and a storage hiccup must not fail
 *  the request). */
export async function deleteRejectionAttachmentObjects(urls: string[]) {
  const config = getStorageConfig()
  const base = getBucketPublicBaseUrl()

  for (const url of urls) {
    const key = objectKeyFromStorageUrl(url, base)
    if (!key) {
      continue
    }
    try {
      const { error } = await getStorageClient().storage.from(config.bucket).remove([key])
      if (error) {
        console.error(`Failed to delete rejection attachment ${key}:`, error.message)
      }
    }
    catch (err) {
      console.error(`Failed to delete rejection attachment ${key}:`, err)
    }
  }
}
