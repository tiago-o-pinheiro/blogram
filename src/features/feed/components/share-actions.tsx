'use client'

import { Copy, Download, Share2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'

type ShareActionsProps = { id: string; title: string; url: string }

export const ShareActions = ({ id, title, url }: ShareActionsProps) => {
  const t = useT()
  const [message, setMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shouldShowLink, setShouldShowLink] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setMessage(t('feed.copied'))
    } catch {
      setShouldShowLink(true)
      setMessage(t('feed.copyError'))
    }
  }

  const handleShare = async () => {
    if (!navigator.share) {
      await handleCopy()
      return
    }
    setIsSharing(true)
    try {
      await navigator.share({ title, url })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage(t('feed.shareError'))
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button
        variant="ghost"
        className="min-h-11 min-w-11 rounded-full"
        aria-label={t('feed.copy')}
        onClick={() => void handleCopy()}
      >
        <Copy className="size-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        className="min-h-11 min-w-11 rounded-full"
        aria-label={t('feed.share')}
        disabled={isSharing}
        onClick={() => void handleShare()}
      >
        <Share2 className="size-4" aria-hidden="true" />
      </Button>
      <a
        href={`/api/posts/${id}/card`}
        download={`blogram-${id}.png`}
        aria-label={t('feed.card')}
        className="inline-flex min-h-11 min-w-11 press items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Download className="size-4" aria-hidden="true" />
      </a>
      {message ? (
        <p
          key={message}
          className="w-full animate-rise-in text-right text-sm text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {shouldShowLink ? (
        <input
          className="w-full animate-rise-in rounded-md border border-border p-2 text-sm"
          aria-label={t('feed.copy')}
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  )
}
