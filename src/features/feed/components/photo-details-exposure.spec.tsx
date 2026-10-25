import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'

import { PhotoDetails } from './photo-details'

describe('PhotoDetails exposure', () => {
  it('BH-3: Given an exposure between half a second and one second, should show it in seconds', () => {
    render(
      <PhotoDetails
        camera={{ model: 'X100V', exposure: 0.7 }}
        locale="en"
        messages={getMessages('en')}
      />,
    )

    expect(screen.getByText('X100V · 0.7 s')).toBeVisible()
  })
})
