'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX, toOwnerIdentifier } from '@/models/models'

import { PasswordField } from '@/components/password-field'
import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'
import { toSignInMessageKey } from '../lib/to-auth-message'

const OFFLINE_RESULT = { error: { status: 0 } }

export const SignInForm = () => {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const identifier = toOwnerIdentifier(readField(data, 'identifier'))
    const password = readField(data, 'password')
    if (!identifier) {
      setError(t(toSignInMessageKey(401)))
      return
    }
    setError('')
    setIsPending(true)
    const result = await (
      identifier.kind === 'email'
        ? authClient.signIn.email({ email: identifier.value, password })
        : authClient.signIn.username({ username: identifier.value, password })
    ).catch(() => OFFLINE_RESULT)
    setIsPending(false)
    if (result.error) {
      setError(t(toSignInMessageKey(result.error.status)))
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
    </form>
  )
}
