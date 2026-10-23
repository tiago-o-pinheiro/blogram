import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ProfilePreview } from './profile-preview'

type PreviewProps = Parameters<typeof ProfilePreview>[0]

const renderPreview = (props: Partial<PreviewProps> = {}) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <ProfilePreview name="::name::" description="::about::" photoSrc={null} {...props} />
    </I18nProvider>,
  )

describe('ProfilePreview', () => {
  it('Given a name and description, should show them in the preview region', () => {
    renderPreview()

    const region = screen.getByRole('region', { name: 'Public profile preview' })
    expect(region).toContainElement(screen.getByRole('heading', { level: 2, name: '::name::' }))
    expect(region).toHaveTextContent('::about::')
  })

  it('Given a blank name, should show the name placeholder', () => {
    renderPreview({ name: '   ' })

    expect(screen.getByRole('heading', { level: 2, name: 'Your name' })).toBeVisible()
  })

  it('Given no description, should show the description placeholder', () => {
    renderPreview({ description: '' })

    expect(screen.getByText('Your description will appear here.')).toBeVisible()
  })

  it('Given no photo, should show the uppercase initial and no image', () => {
    renderPreview({ name: 'ada' })

    expect(screen.getByText('A')).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('Given a photo, should show it with a descriptive name instead of the initial', () => {
    renderPreview({ name: 'Ada', photoSrc: '/api/profile/photo' })

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo',
    )
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })
})
