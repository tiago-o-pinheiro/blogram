import { describe, expect, it } from 'vitest'

import { createSecretBox } from './secret-box'

const SECRET = '::secret-of-at-least-thirty-two-chars::'

describe('createSecretBox', () => {
  it('Given a plain key, should seal it into a value that differs from the plaintext', () => {
    const box = createSecretBox(SECRET)

    const sealed = box.seal('sk-plain-key')

    expect(sealed).not.toContain('sk-plain-key')
    expect(sealed.startsWith('v1.')).toBe(true)
  })

  it('Given a sealed key, should open it back to the plaintext', () => {
    const box = createSecretBox(SECRET)

    expect(box.open(box.seal('sk-plain-key'))).toBe('sk-plain-key')
  })

  it('Given the same plaintext twice, should seal different values', () => {
    const box = createSecretBox(SECRET)

    expect(box.seal('sk-plain-key')).not.toBe(box.seal('sk-plain-key'))
  })

  it('Given another secret, should return null', () => {
    const sealed = createSecretBox(SECRET).seal('sk-plain-key')

    expect(createSecretBox(`${SECRET}-other`).open(sealed)).toBeNull()
  })

  it('Given a tampered value, should return null', () => {
    const box = createSecretBox(SECRET)
    const [version, iv, tag, data] = box.seal('sk-plain-key').split('.')
    const tampered = [version, iv, tag, `${data?.slice(0, -2)}AA`].join('.')

    expect(box.open(tampered)).toBeNull()
  })

  it('Given malformed input, should return null', () => {
    const box = createSecretBox(SECRET)

    expect(box.open('')).toBeNull()
    expect(box.open('v2.a.b.c')).toBeNull()
    expect(box.open('v1.a.b')).toBeNull()
  })
})
