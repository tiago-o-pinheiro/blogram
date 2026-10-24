'use client'

import { Button } from '@/design-system/ui/button'
import { Skeleton } from '@/design-system/ui/skeleton'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

export const UserMenu = () => {
  const t = useT()
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div role="status" aria-label={t('common.loading')}>
        <Skeleton className="h-11 w-48" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="flex animate-fade-in items-center gap-4">
      <p>{t('menu.signedInAs', { name: data.user.name })}</p>
      <Button variant="secondary" onClick={() => void authClient.signOut()}>
        {t('menu.signOut')}
      </Button>
    </div>
  )
}
