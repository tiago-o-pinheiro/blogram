// @vitest-environment node
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..', '..', '..')

describe('removed sample notes domain', () => {
  it.each([
    'src/app/api/notes',
    'src/server/modules/notes',
    'src/models/note.model.ts',
    'src/models/note.model.spec.ts',
  ])('Given the notes sample domain, should not have %s anymore', (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false)
  })
})

describe('removed public sign-up', () => {
  it.each([
    'src/app/sign-up/page.tsx',
    'src/features/auth/components/sign-up-form.tsx',
    'src/features/auth/components/sign-up-form.spec.tsx',
  ])('Given public sign-up is disabled, should not have %s anymore', (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false)
  })
})
