// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { installationService } from '@/server/modules/installation/services/installation.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

import Page from './page'

const renderPage = async () =>
  renderToStaticMarkup(
    <I18nProvider locale="en" messages={getMessages('en')}>
      {await Page()}
    </I18nProvider>,
  )

describe('Home page', () => {
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
})
