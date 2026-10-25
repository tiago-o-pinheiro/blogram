import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'

import { PhotoDetails } from './photo-details'

describe('PhotoDetails', () => {
  it('Given full camera details, should render one compact line', () => {
    render(
      <PhotoDetails
        camera={{
          model: 'X100V',
          focalLength: 23,
          aperture: 2,
          exposure: 0.004,
          iso: 200,
          takenOn: '2026-05-03',
        }}
        locale="en"
        messages={getMessages('en')}
      />,
    )

    expect(
      screen.getByText('X100V · 23 mm · ƒ/2 · 1/250 s · ISO 200 · taken May 3, 2026'),
    ).toBeVisible()
  })

  it('Given make and model, should not repeat the make', () => {
    render(
      <PhotoDetails
        camera={{ make: 'FUJIFILM', model: 'FUJIFILM X100V', exposure: 2 }}
        locale="en"
        messages={getMessages('en')}
      />,
    )

    expect(screen.getByText('FUJIFILM X100V · 2 s')).toBeVisible()
  })

  it('Given a make without a model name, should join them', () => {
    render(
      <PhotoDetails
        camera={{ make: 'Leica', model: 'Q3' }}
        locale="en"
        messages={getMessages('en')}
      />,
    )

    expect(screen.getByText('Leica Q3')).toBeVisible()
  })

  it('Given no camera fields, should render nothing', () => {
    const { container } = render(
      <PhotoDetails camera={{}} locale="en" messages={getMessages('en')} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
