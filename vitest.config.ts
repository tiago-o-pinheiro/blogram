import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': `${import.meta.dirname}/src` },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/test/setup-db.ts'],
    include: ['src/**/*.spec.{ts,tsx}', 'scripts/**/*.spec.mjs', 'config/**/*.spec.mjs'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}'],
    },
  },
})
