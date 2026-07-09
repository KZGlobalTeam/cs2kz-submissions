import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: '.',
  dir: {
    app: 'app',
  },
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  alias: {
    '~': fileURLToPath(new URL('./', import.meta.url)),
    '@': fileURLToPath(new URL('./', import.meta.url)),
  },
  css: ['~/app/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
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
      siteUrl: 'http://localhost:3000',
      appName: 'CS2KZ Submissions',
    },
  },
  routeRules: {
    '/api/**': {
      cors: false,
    },
  },
  nitro: {
    experimental: {
      wasm: true,
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
