'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX } from '@/models/models'

import { PasswordField } from '@/components/password-field'

import { readField } from '../lib/read-field'
import { signInOwner } from '../lib/sign-in-owner'
import { toSignInMessageKey } from '../lib/to-auth-message'

export const SignInForm = () => {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    setIsPending(true)
    const { status } = await signInOwner(readField(data, 'identifier'), readField(data, 'password'))
    setIsPending(false)
    if (status !== null) {
      setError(t(toSignInMessageKey(status)))
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Field label={t('signin.identifier')} name="identifier" required autoComplete="username" />
      <PasswordField
        label={t('signin.password')}
        name="password"
        required
        autoComplete="current-password"
        maxLength={OWNER_PASSWORD_MAX}
      />
      {error ? (
        <p role="alert" className="animate-rise-in text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('signin.submitting')}>
        {t('signin.submit')}
      </Button>
      <Link
        href="/forgot-password"
        className="inline-flex min-h-11 press animate-fade-in items-center justify-center rounded-md text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {t('recovery.title')}
      </Link>
    </form>
  )
}
