'use client'

import { Copy, Download, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button, buttonVariants } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { PasswordField } from '@/components/password-field'

import { generateRecoveryCodes, RecoveryCodesApiError } from '../api/recovery-codes-api'
import { readField } from '../lib/read-field'

type RecoveryCodesProps = { status: Models.RecoveryCodeStatus }

const toGenerateErrorKey = (error: unknown): TranslationKey =>
  error instanceof RecoveryCodesApiError && error.status === 403
    ? 'recovery.codes.wrongPassword'
    : 'recovery.codes.error'

const toStatusKey = (status: Models.RecoveryCodeStatus): TranslationKey => {
  if (status.remaining > 0) {
    return 'recovery.codes.remaining'
  }
  return status.generatedAt ? 'recovery.codes.exhausted' : 'recovery.codes.none'
}

export const RecoveryCodes = ({ status }: RecoveryCodesProps) => {
  const t = useT()
  const router = useRouter()
  const [codes, setCodes] = useState<string[] | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [copyKey, setCopyKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)
  const statusKey = toStatusKey(status)
  const hasCodes = status.generatedAt !== null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) {
      return
    }
    const form = event.currentTarget
    setErrorKey(null)
    setCopyKey(null)
    setIsPending(true)
    try {
      const created = await generateRecoveryCodes(readField(new FormData(form), 'password'))
      form.reset()
      setCodes(created)
      router.refresh()
    } catch (error) {
      setErrorKey(toGenerateErrorKey(error))
    } finally {
      setIsPending(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyKey('recovery.codes.copied')
    } catch {
      setCopyKey('recovery.codes.copyFailed')
    }
  }

  const fileText = codes ? [t('recovery.codes.fileTitle'), '', ...codes, ''].join('\n') : ''

  return (
    <section
      aria-labelledby="recovery-codes-title"
      className="flex animate-rise-in flex-col gap-4 rounded-xl border border-line bg-card p-5"
    >
      <h2 id="recovery-codes-title" className="flex items-center gap-2 text-lg font-semibold">
        <KeyRound aria-hidden="true" className="size-5" />
        {t('recovery.codes.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('recovery.codes.description')}</p>
      <p key={statusKey} className="animate-fade-in text-sm text-foreground">
        {t(statusKey, { count: status.remaining, total: Models.RECOVERY_CODE_COUNT })}
      </p>
      {codes ? (
        <div className="flex animate-rise-in flex-col gap-4">
          <p role="status" className="text-sm font-medium text-foreground">
            {t('recovery.codes.saveNow')}
          </p>
          <ul
            aria-label={t('recovery.codes.list')}
            className="grid grid-cols-1 gap-2 font-mono text-sm stagger sm:grid-cols-2"
          >
            {codes.map((code) => (
              <li
                key={code}
                className="animate-scale-in rounded-md bg-muted px-3 py-2 text-center tracking-wider whitespace-nowrap select-all"
              >
                {code}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void handleCopy(fileText)}>
              <Copy aria-hidden="true" className="size-4" />
              {t('recovery.codes.copy')}
            </Button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(fileText)}`}
              download="blogram-recovery-codes.txt"
              className={buttonVariants({ variant: 'secondary' })}
            >
              <Download aria-hidden="true" className="size-4" />
              {t('recovery.codes.download')}
            </a>
            <Button variant="ghost" onClick={() => setCodes(null)}>
              {t('recovery.codes.done')}
            </Button>
          </div>
          {copyKey ? (
            <p
              key={copyKey}
              role="status"
              className="animate-rise-in text-sm text-muted-foreground"
            >
              {t(copyKey)}
            </p>
          ) : null}
        </div>
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex animate-rise-in flex-col gap-4"
        >
          <PasswordField
            label={t('account.currentPassword')}
            name="password"
            required
            autoComplete="current-password"
            maxLength={Models.OWNER_PASSWORD_MAX}
            disabled={isPending}
            hint={hasCodes ? t('recovery.codes.replaceHint') : undefined}
          />
          {errorKey ? (
            <p key={errorKey} role="alert" className="animate-rise-in text-sm text-danger">
              {t(errorKey)}
            </p>
          ) : null}
          <Button
            type="submit"
            variant={hasCodes ? 'secondary' : 'primary'}
            isLoading={isPending}
            loadingLabel={t('recovery.codes.generating')}
          >
            {t(hasCodes ? 'recovery.codes.regenerate' : 'recovery.codes.generate')}
          </Button>
        </form>
      )}
    </section>
  )
}
