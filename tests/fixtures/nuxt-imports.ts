/** Minimal stand-in for Nuxt's virtual `#imports` module, aliased in
 *  `vitest.config.ts` so specs can import server modules that transitively
 *  reach `server/utils/config.ts` (the only `#imports` consumer in the repo).
 *  In a real build Nuxt generates `#imports`; under plain vitest it does not
 *  exist, so this fixture supplies the one export the server graph uses.
 *  Runtime values mirror the local dev defaults; no spec ever calls through
 *  to a database, so nothing here is exercised beyond import resolution. */
export function useRuntimeConfig() {
  return {
    sessionSecret: '',
    steamRealm: '',
    steamReturnUrl: '',
    steamApiKey: '',
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
    supabaseStorageBucket: '',
    databaseUrl: '',
    discordWebhookUrl: '',
    public: {
      siteUrl: 'http://localhost:11451',
      appName: 'CS2KZ Submissions',
    },
  }
}