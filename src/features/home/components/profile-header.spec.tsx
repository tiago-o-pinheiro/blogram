import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ProfileHeader } from './profile-header'

const renderHeader = (props: Parameters<typeof ProfileHeader>[0]) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <ProfileHeader {...props} />
    </I18nProvider>,
  )

describe('ProfileHeader', () => {
  it('Given no heading level, should render the name as an h1 with the description', () => {
    renderHeader({ name: '::name::', description: '::about::', photoSrc: null })

    expect(screen.getByRole('heading', { level: 1, name: '::name::' })).toBeVisible()
    expect(screen.getByText('::about::')).toBeVisible()
  })

  it('Given as h2, should render the name as an h2', () => {
    renderHeader({ name: '::name::', description: '', photoSrc: null, as: 'h2' })

    expect(screen.getByRole('heading', { level: 2, name: '::name::' })).toBeVisible()
  })

  it('Given a photo, should render it with the translated alt text', () => {
    renderHeader({ name: 'Ada', description: '', photoSrc: '/api/profile/photo' })

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo',
    )
  })

  it('Given no photo, should show the hidden initial fallback instead of an image', () => {
    renderHeader({ name: 'ada', description: '', photoSrc: null })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('A')).toHaveAttribute('aria-hidden', 'true')
  })

  it('Given children, should render them inside the header after the description', () => {
    renderHeader({
      name: '::name::',
      description: '::about::',
      photoSrc: null,
      children: <a href="/archive">::link::</a>,
    })

    const header = screen.getByRole('heading', { name: '::name::' }).closest('header')
    const link = screen.getByRole('link', { name: '::link::' })

    expect(header).toContainElement(link)
    expect(
      screen.getByText('::about::').compareDocumentPosition(link) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('Given no children, should render no nav', () => {
    renderHeader({ name: '::name::', description: '::about::', photoSrc: null })

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
