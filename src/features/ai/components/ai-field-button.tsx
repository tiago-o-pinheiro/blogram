import { Sparkles } from 'lucide-react'

import { Button } from '@/design-system/ui/button'

type AiFieldButtonProps = {
  label: string
  isPending: boolean
  isDisabled: boolean
  disabledHint?: string
  onClick: () => void
}

export const AiFieldButton = ({
  label,
  isPending,
  isDisabled,
  disabledHint,
  onClick,
}: AiFieldButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label={label}
    title={isDisabled && disabledHint ? disabledHint : label}
    disabled={isDisabled}
    isLoading={isPending}
    loadingLabel={label}
    onClick={onClick}
  >
    <Sparkles aria-hidden="true" className="size-4" />
  </Button>
)
