import { useId } from 'react'

import { Button } from '@/design-system/ui/button'
import { Input } from '@/design-system/ui/input'

const MASK = '•'.repeat(12)

type SavedApiKeyProps = {
  label: string
  hint: string
  description: string
  replaceLabel: string
  disabled: boolean
  onReplace: () => void
}

export const SavedApiKey = ({
  label,
  hint,
  description,
  replaceLabel,
  disabled,
  onReplace,
}: SavedApiKeyProps) => {
  const inputId = useId()
  const descriptionId = `${inputId}-description`

  return (
    <div className="flex animate-rise-in flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          value={`${MASK}${hint}`}
          readOnly
          aria-describedby={descriptionId}
          className="pr-28 tracking-widest"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute inset-y-0 right-1 my-auto"
          disabled={disabled}
          onClick={onReplace}
        >
          {replaceLabel}
        </Button>
      </div>
      <p id={descriptionId} className="sr-only">
        {description}
      </p>
    </div>
  )
}
