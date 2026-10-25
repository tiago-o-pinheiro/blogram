// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { db } from '@/server/lib/db'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { post } from '@/server/modules/posts/schemas/post.table'
import { profileService } from '@/server/modules/profile/services/profile.service'

import Page, { generateMetadata } from './page'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}))

const renderPage = async () =>
  renderToStaticMarkup(
    <I18nProvider locale="en" messages={getMessages('en')}>
      {await Page()}
    </I18nProvider>,
  )

describe('Home page', () => {
  it('Given an unfinished profile, should keep public metadata neutral', async () => {
    await profileService.saveProfile({ name: '::pending-name::', description: '::pending-about::' })

    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Blogram')
    expect(metadata.description).not.toContain('::pending-about::')
  })
  it('Given a pending installation, should show the neutral pending message', async () => {
    vi.spyOn(installationService, 'getStatus').mockResolvedValue('pending')

    const markup = await renderPage()

    expect(markup).toContain(getMessages('en')['home.pending.title'])
    expect(markup).not.toContain('href=')
  })

  it('Given a completed installation with a photo, should show the profile and its photo', async () => {
    vi.spyOn(installationService, 'getStatus').mockResolvedValue('completed')
    vi.spyOn(profileService, 'getProfile').mockResolvedValue({
      name: 'Ada Lovelace',
      description: 'Analyst',
      hasPhoto: true,
    })

    const markup = await renderPage()

    expect(markup).toContain('Ada Lovelace')
    expect(markup).toContain('Analyst')
    expect(markup).toContain('src="/api/profile/photo"')
  })

  it('Given a search term, should list only matching posts under a results heading', async () => {
    vi.spyOn(installationService, 'getStatus').mockResolvedValue('completed')
    vi.spyOn(profileService, 'getProfile').mockResolvedValue({
      name: 'Ada Lovelace',
      description: 'Analyst',
      hasPhoto: false,
    })
    await db.insert(post).values([
      {
        publicId: 'Harbour123',
        type: 'news',
        status: 'published',
        text: 'Morning at the Harbour',
        publishedAt: new Date(),
      },
      {
        publicId: 'Forest1234',
        type: 'news',
        status: 'published',
        text: 'Deep in the forest',
        publishedAt: new Date(),
      },
    ])

    const markup = renderToStaticMarkup(
      <I18nProvider locale="en" messages={getMessages('en')}>
        {await Page({ searchParams: Promise.resolve({ q: '  harbour ' }) })}
      </I18nProvider>,
    )

    expect(markup).toContain('Results for “harbour”')
    expect(markup).toContain('Morning at the Harbour')
    expect(markup).not.toContain('Deep in the forest')
  })

  it('Given a blank search term, should show the normal feed', async () => {
    vi.spyOn(installationService, 'getStatus').mockResolvedValue('completed')
    vi.spyOn(profileService, 'getProfile').mockResolvedValue({
      name: 'Ada Lovelace',
      description: 'Analyst',
      hasPhoto: false,
    })

    const markup = renderToStaticMarkup(
      <I18nProvider locale="en" messages={getMessages('en')}>
        {await Page({ searchParams: Promise.resolve({ q: '   ' }) })}
      </I18nProvider>,
    )

    expect(markup).not.toContain('Results for')
    expect(markup).toContain(getMessages('en')['feed.empty'])
  })
})
