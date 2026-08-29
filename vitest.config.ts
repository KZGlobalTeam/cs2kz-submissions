import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Nuxt's virtual `#imports` module does not exist under plain vitest;
      // point it at a fixture supplying the one export the server graph uses
      // (see tests/fixtures/nuxt-imports.ts), so specs can import server
      // modules that reach server/utils/config.ts.
      '#imports': fileURLToPath(new URL('./tests/fixtures/nuxt-imports.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
