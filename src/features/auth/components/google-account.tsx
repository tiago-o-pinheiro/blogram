import { headers } from 'next/headers'

import { getServerTranslator } from '@/i18n/server'

import { authService } from '@/server/modules/auth/services/auth.service'
import { googleSettingsService } from '@/server/modules/auth/services/google-settings.service'

import { GoogleAccountControls } from './google-account-controls'
import { GoogleSignInSettingsForm } from './google-sign-in-settings-form'

export const GoogleAccount = async () => {
  const [settings, account, t] = await Promise.all([
    googleSettingsService.getSettings(),
    authService.getGoogleAccount(await headers()),
    getServerTranslator(),
  ])
  if (!account) {
    return null
  }
  return (
    <section
      aria-labelledby="google-title"
      className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5"
    >
      <h2 id="google-title" className="text-lg font-semibold">
        {t('google.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('google.description')}</p>
      <GoogleSignInSettingsForm settings={settings} />
      <GoogleAccountControls {...account} />
    </section>
  )
}
