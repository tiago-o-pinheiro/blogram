import { createEslintConfig } from './config/eslint/index.mjs'

export default createEslintConfig({
  rootDir: import.meta.dirname,
  scope: '@blogram',
  frontend: 'next',
  webDir: '.',
  apiDir: '.',
  envFile: 'src/server/config/env.ts',
})
