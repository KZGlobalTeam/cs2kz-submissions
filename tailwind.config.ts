import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#08090d',
        panel: '#10131a',
        line: '#222838',
        muted: '#8e97ab',
        accent: '#7c9cff',
        accent2: '#72e0c3',
        danger: '#ff7a90',
        warning: '#f5c46b',
      },
      boxShadow: {
        panel: '0 20px 45px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
