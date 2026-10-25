import { Progress as ProgressPrimitive } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '../lib/cn'

export type ProgressProps = Omit<ComponentProps<typeof ProgressPrimitive.Root>, 'value'> & {
  value: number
  label: string
}

export const Progress = ({ value, label, className, ...props }: ProgressProps) => {
  const percent = Math.min(100, Math.max(0, value))

  return (
    <ProgressPrimitive.Root
      value={percent}
      aria-label={label}
      className={cn(
        'relative h-2 w-full animate-fade-in overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full rounded-full bg-accent transition"
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}
