import { describe, expect, it } from 'vitest'

import { readField } from './read-field'

describe('readField', () => {
  it('Given a text field, should return its value', () => {
    const data = new FormData()
    data.set('email', 'member@example.test')

    expect(readField(data, 'email')).toBe('member@example.test')
  })

  it('Given a missing field, should return an empty string', () => {
    expect(readField(new FormData(), 'email')).toBe('')
  })

  it('Given a file field, should return an empty string', () => {
    const data = new FormData()
    data.set('avatar', new File(['::content::'], '::avatar::.txt'))

    expect(readField(data, 'avatar')).toBe('')
  })
})
