import { type ReactNode } from 'react'

import { AdminShell } from '@/features/admin/components/admin-shell'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'

export const dynamic = 'force-dynamic'

type LayoutProps = {
  children: ReactNode
}

const Layout = async ({ children }: LayoutProps) => {
  await requireOwnerPage()

  return <AdminShell>{children}</AdminShell>
}

export default Layout
