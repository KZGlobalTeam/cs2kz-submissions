import type { H3Event } from 'h3'

import { useRuntimeConfig } from '#imports'

interface CloudflareEnv {
  NUXT_STEAM_REALM?: string
  NUXT_STEAM_RETURN_URL?: string
  NUXT_STEAM_API_KEY?: string
  NUXT_DATABASE_URL?: string
  NUXT_SESSION_SECRET?: string
  NUXT_SUPABASE_URL?: string
  NUXT_SUPABASE_SERVICE_ROLE_KEY?: string
  NUXT_SUPABASE_STORAGE_BUCKET?: string
  NUXT_PUBLIC_SITE_URL?: string
}

declare global {
  var __env__: Record<string, string | undefined> | undefined
}

function getCloudflareEnv(event?: H3Event): Partial<CloudflareEnv> {
  // In a Cloudflare Pages Function the bindings are available on the request
  // context set up by Nitro's cloudflare-pages preset.
  const cloudflare = (event?.context as { cloudflare?: { env?: CloudflareEnv } })?.cloudflare
  if (cloudflare?.env) {
    return cloudflare.env
  }

  // Fallback for code executed outside an explicit event handler (e.g. the
  // database singleton created lazily on the first request).
  if (typeof globalThis.__env__ !== 'undefined') {
    return globalThis.__env__
  }

  return {}
}

export interface AppConfig {
  databaseUrl: string | undefined
  sessionSecret: string | undefined
  steamRealm: string | undefined
  steamReturnUrl: string | undefined
  steamApiKey: string | undefined
  supabaseUrl: string | undefined
  supabaseServiceRoleKey: string | undefined
  supabaseStorageBucket: string | undefined
  siteUrl: string | undefined
}

export function getAppConfig(event?: H3Event): AppConfig {
  const runtime = useRuntimeConfig()
  const env = getCloudflareEnv(event)

  return {
    databaseUrl: env.NUXT_DATABASE_URL ?? runtime.databaseUrl ?? undefined,
    sessionSecret: env.NUXT_SESSION_SECRET ?? runtime.sessionSecret ?? undefined,
    steamRealm: env.NUXT_STEAM_REALM ?? runtime.steamRealm ?? undefined,
    steamReturnUrl: env.NUXT_STEAM_RETURN_URL ?? runtime.steamReturnUrl ?? undefined,
    steamApiKey: env.NUXT_STEAM_API_KEY ?? runtime.steamApiKey ?? undefined,
    supabaseUrl: env.NUXT_SUPABASE_URL ?? runtime.supabaseUrl ?? undefined,
    supabaseServiceRoleKey: env.NUXT_SUPABASE_SERVICE_ROLE_KEY ?? runtime.supabaseServiceRoleKey ?? undefined,
    supabaseStorageBucket: env.NUXT_SUPABASE_STORAGE_BUCKET ?? runtime.supabaseStorageBucket ?? undefined,
    siteUrl: env.NUXT_PUBLIC_SITE_URL ?? runtime.public.siteUrl ?? undefined,
  }
}
