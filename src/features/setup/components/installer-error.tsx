'use client'

import { useT } from '@/i18n/i18n-context'

export const InstallerError = () => {
  const t = useT()

  return (
    <section role="alert" className="flex flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold">{t('unlock.installer.title')}</h1>
      <p className="text-muted-foreground">{t('unlock.installer.description')}</p>
      <ol className="list-decimal pl-6">
        <li>{t('unlock.installer.step1')}</li>
        <li>{t('unlock.installer.step2')}</li>
        <li>{t('unlock.installer.step3')}</li>
      </ol>
      <p className="text-sm text-muted-foreground">{t('unlock.installer.hint')}</p>
    </section>
  )
}
