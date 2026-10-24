import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { PlaceFields } from './place-fields'

const PlaceEditor = () => {
  const [place, setPlace] = useState<Models.PostPlace | null>(null)
  return (
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PlaceFields value={place} onChange={setPlace} isDisabled={false} />
    </I18nProvider>
  )
}

describe('Post places', () => {
  it('Given an optional place, should allow naming, finding and removing it', async () => {
    const user = userEvent.setup()
    render(<PlaceEditor />)
    await user.click(screen.getByRole('button', { name: 'Add a place' }))
    await user.type(screen.getByRole('textbox', { name: 'Place name' }), 'A place & park')
    expect(screen.getByRole('link', { name: 'Find on OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/search?query=A%20place%20%26%20park',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'OpenStreetMap link (optional)' }),
      'https://www.openstreetmap.org/?mlat=40&mlon=-3',
    )
    expect(screen.getByRole('textbox', { name: 'OpenStreetMap link (optional)' })).toBeValid()
    await user.click(screen.getByRole('button', { name: 'Remove place' }))
    expect(screen.queryByRole('textbox', { name: 'Place name' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a place' })).toBeEnabled()
  })
})
