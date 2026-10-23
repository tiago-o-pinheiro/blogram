import { describe, expect, it } from 'vitest'

import { wrapCardText } from './share-card.service'

describe('Share card text', () => {
  it('Given a normal caption, should wrap between whole words', () => {
    expect(wrapCardText('A quiet moment at the end of the day.', 34, 5)).toEqual([
      'A quiet moment at the end of the',
      'day.',
    ])
  })
  it('Given very long text, should limit lines and show an ellipsis', () => {
    const lines = wrapCardText('A'.repeat(500), 34, 5)

    expect(lines).toHaveLength(5)
    expect(lines[4]).toHaveLength(34)
    expect(lines[4]).toMatch(/…$/)
  })

  it('Given joined emoji or multilingual text, should preserve complete characters', () => {
    expect(wrapCardText('👩🏽‍💻👩🏽‍💻👩🏽‍💻', 4, 2)).toEqual(['👩🏽‍💻👩🏽‍💻', '👩🏽‍💻'])
    expect(wrapCardText('你好世界', 4, 2)).toEqual(['你好', '世界'])
  })
})
