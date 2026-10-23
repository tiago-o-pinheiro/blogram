'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'

import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'
import { toSignUpMessage } from '../lib/to-auth-message'

export const SignUpForm = () => {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    setIsPending(true)
    const result = await authClient.signUp
      .email({
        name: readField(data, 'name'),
        email: readField(data, 'email'),
        password: readField(data, 'password'),
      })
      .catch(() => ({ error: { status: 0 } }))
    setIsPending(false)
    if (result.error) {
      setError(toSignUpMessage(result.error.status))
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Field label="Name" name="name" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel="Creating account">
        Sign up
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
