import { Sparkles } from 'lucide-react'

import { Button } from '@/design-system/ui/button'
import { Textarea } from '@/design-system/ui/textarea'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { AI_PROMPT_MAX } from '@/models/models'

type AiPromptBarProps = {
  prompt: string
  isDisabled: boolean
  isGenerating: boolean
  hasContext: boolean
  messageKey: TranslationKey | null
  canUndo: boolean
  onPromptChange: (prompt: string) => void
  onGenerateAll: () => void
  onUndo: () => void
}

const ERROR_KEY_PREFIX = 'aiAssist.errors.'

export const AiPromptBar = ({
  prompt,
  isDisabled,
  isGenerating,
  hasContext,
  messageKey,
  canUndo,
  onPromptChange,
  onGenerateAll,
  onUndo,
}: AiPromptBarProps) => {
  const t = useT()
  const isError = messageKey?.startsWith(ERROR_KEY_PREFIX) === true

  return (
    <section
      aria-label={t('aiAssist.title')}
      className="flex animate-rise-in flex-col gap-3 rounded-md border border-input p-4"
    >
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles aria-hidden="true" className="size-4" />
        {t('aiAssist.title')}
      </h2>
      <Textarea
        label={t('aiAssist.prompt')}
        placeholder={t('aiAssist.promptPlaceholder')}
        rows={2}
        maxLength={AI_PROMPT_MAX}
        value={prompt}
        disabled={isDisabled}
        onChange={(event) => onPromptChange(event.target.value)}
      />
      {!hasContext ? (
        <p className="text-sm text-muted-foreground">{t('aiAssist.needsContext')}</p>
      ) : null}
      {messageKey ? (
        <p
          key={messageKey}
          role={isError ? 'alert' : 'status'}
          className={`animate-rise-in text-sm ${isError ? 'text-danger' : 'text-muted-foreground'}`}
        >
          {t(messageKey)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={isDisabled || !hasContext}
          isLoading={isGenerating}
          loadingLabel={t('aiAssist.generating')}
          onClick={onGenerateAll}
        >
          <Sparkles aria-hidden="true" className="size-4" />
          {t('aiAssist.generateAll')}
        </Button>
        {canUndo ? (
          <Button
            type="button"
            variant="ghost"
            disabled={isDisabled}
            className="animate-rise-in"
            onClick={onUndo}
          >
            {t('aiAssist.undo')}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
