import { createVitestConfig } from './config/vitest/index.ts'

export default createVitestConfig({
  root: import.meta.dirname,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts', './src/test/setup-db.ts'],
})
