'use client'

import Link from 'next/link'

import { useT } from '@/i18n/i18n-context'

import { UserMenu } from '@/features/auth/components/user-menu'

type AdminDashboardProps = {
  name: string
}

export const AdminDashboard = ({ name }: AdminDashboardProps) => {
  const t = useT()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t('admin.welcome', { name })}</h1>
      <Link
        href="/admin/account"
        className="inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {t('admin.accountLink')}
      </Link>
      <UserMenu />
    </div>
  )
}
