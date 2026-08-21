import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: '.',
  dir: {
    app: 'app',
  },
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  alias: {
    '~': fileURLToPath(new URL('./', import.meta.url)),
    '@': fileURLToPath(new URL('./', import.meta.url)),
  },
  css: ['~/app/assets/css/main.css'],

  ui: {
    colorMode: false,
  },

  app: {
    head: {
      title: 'CS2KZ Global Submissions',
      htmlAttrs: {
        class: 'dark',
      },
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    sessionSecret: '',
    steamRealm: '',
    steamReturnUrl: '',
    steamApiKey: '',
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
    supabaseStorageBucket: '',
    databaseUrl: '',
    public: {
      siteUrl: 'http://localhost:11451',
      appName: 'CS2KZ Submissions',
    },
  },
  routeRules: {
    '/api/**': {
      cors: false,
    },
  },
  nitro: {
    preset: 'cloudflare-pages',
    cloudflare: {
      // Force node-compat so `node:crypto` (needed by @neondatabase/serverless
      // SCRAM auth, and by anything else using createHash/createHmac) is
      // externalized to the Workers runtime instead of being inlined as
      // unenv's `notImplemented` stub. Requires `nodejs_compat` at runtime.
      nodeCompat: true,
    },
    experimental: {
      wasm: true,
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  devServer: {
    port: 11451
  }
})
