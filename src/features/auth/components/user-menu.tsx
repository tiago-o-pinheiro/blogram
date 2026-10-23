'use client'

import Link from 'next/link'

import { Button } from '@/design-system/ui/button'
import { Skeleton } from '@/design-system/ui/skeleton'

import { authClient } from '@/lib/auth-client'

export const UserMenu = () => {
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div role="status" aria-label="Checking your session">
        <Skeleton className="h-11 w-48" />
      </div>
    )
  }

  if (!data) {
    return (
      <nav aria-label="Account" className="flex items-center gap-4">
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
        <Link href="/sign-up" className="underline">
          Sign up
        </Link>
      </nav>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <p>Signed in as {data.user.name}</p>
      <Button variant="secondary" onClick={() => void authClient.signOut()}>
        Sign out
      </Button>
    </div>
  )
}
