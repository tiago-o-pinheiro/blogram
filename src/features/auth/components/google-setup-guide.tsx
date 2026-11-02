'use client'

import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

type GoogleSetupGuideProps = { origin: string; redirectUri: string }

type CopyValueProps = { label: string; value: string }

const CONSOLE_LINKS: ReadonlyArray<{
  textKey: TranslationKey
  linkKey: TranslationKey
  href: string
}> = [
  {
    textKey: 'google.guide.project',
    linkKey: 'google.guide.projectLink',
    href: 'https://console.cloud.google.com/auth/overview',
  },
  {
    textKey: 'google.guide.audience',
    linkKey: 'google.guide.audienceLink',
    href: 'https://console.cloud.google.com/auth/audience',
  },
]

const CLIENT_LINK = 'https://console.cloud.google.com/auth/clients/create'

const ConsoleLink = ({ href, label }: { href: string; label: string }) => {
  const t = useT()
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex min-h-11 press items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {label}
      <ExternalLink aria-hidden="true" className="size-4" />
      <span className="sr-only">({t('google.guide.opensNewTab')})</span>
    </a>
  )
}

const CopyValue = ({ label, value }: CopyValueProps) => {
  const t = useT()
  const [result, setResult] = useState<'copied' | 'failed' | null>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setResult('copied')
    } catch {
      setResult('failed')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all text-foreground select-all">
          {value}
        </code>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t('google.guide.copy', { label })}
          onClick={() => void handleCopy()}
        >
          {result === 'copied' ? (
            <Check key="copied" aria-hidden="true" className="size-4 animate-scale-in" />
          ) : (
            <Copy key="copy" aria-hidden="true" className="size-4 animate-scale-in" />
          )}
        </Button>
      </div>
      <p
        key={result ?? 'idle'}
        role="status"
        className={result ? 'animate-rise-in text-sm text-muted-foreground' : 'sr-only'}
      >
        {result === 'copied' ? t('google.guide.copied', { label }) : null}
        {result === 'failed' ? t('google.settings.copyFailed') : null}
      </p>
    </div>
  )
}

export const GoogleSetupGuide = ({ origin, redirectUri }: GoogleSetupGuideProps) => {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('google.guide.intro')}</p>
      <ol className="flex list-decimal flex-col gap-4 pl-5 text-sm stagger *:animate-rise-in marker:text-muted-foreground">
        {CONSOLE_LINKS.map((step) => (
          <li key={step.href}>
            <div className="flex flex-col gap-1">
              <span>{t(step.textKey)}</span>
              <ConsoleLink href={step.href} label={t(step.linkKey)} />
            </div>
          </li>
        ))}
        <li>
          <div className="flex flex-col gap-3">
            <span>{t('google.guide.client')}</span>
            <ConsoleLink href={CLIENT_LINK} label={t('google.guide.clientLink')} />
            <CopyValue label={t('google.guide.origin')} value={origin} />
            <CopyValue label={t('google.settings.redirectUri')} value={redirectUri} />
          </div>
        </li>
        <li>{t('google.guide.download')}</li>
      </ol>
    </div>
  )
}
