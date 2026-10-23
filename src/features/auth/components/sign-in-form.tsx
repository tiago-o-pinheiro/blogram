'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'

import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'
import { toSignInMessage } from '../lib/to-auth-message'

export const SignInForm = () => {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    setIsPending(true)
    const result = await authClient.signIn
      .email({ email: readField(data, 'email'), password: readField(data, 'password') })
      .catch(() => ({ error: { status: 0 } }))
    setIsPending(false)
    if (result.error) {
      setError(toSignInMessage(result.error.status))
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel="Signing in">
        Sign in
      </Button>
      <p className="text-sm text-muted-foreground">
        No account yet?{' '}
        <Link href="/sign-up" className="underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
