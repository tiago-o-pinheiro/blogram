'use client'

import { CirclePlay, ImageIcon, LinkIcon, type LucideIcon, Newspaper, Video } from 'lucide-react'

import { cn } from '@/design-system/ui/lib/cn'
import { SlidingPill } from '@/design-system/ui/sliding-pill'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

type PostTypePickerProps = {
  legend: string
  value: Models.PostType
  isDisabled: boolean
  onChange: (type: Models.PostType) => void
}

const TYPE_ICONS = {
  photo: ImageIcon,
  video: Video,
  youtube: CirclePlay,
  link: LinkIcon,
  news: Newspaper,
} satisfies Record<Models.PostType, LucideIcon>

export const PostTypePicker = ({ legend, value, isDisabled, onChange }: PostTypePickerProps) => {
  const t = useT()

  return (
    <fieldset role="radiogroup">
      <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
      <div className="relative flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        <SlidingPill activeKey={value} className="rounded-lg bg-card shadow-sm" />
        {Models.POST_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type]
          const isActive = value === type

          return (
            <label
              key={type}
              data-active={isActive || undefined}
              className={cn(
                'relative flex min-h-11 min-w-24 flex-1 press cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:opacity-disabled',
                isActive &&
                  'bg-card text-foreground shadow-sm pill-ready:bg-transparent pill-ready:shadow-none',
              )}
            >
              <input
                type="radio"
                name="type"
                value={type}
                checked={value === type}
                disabled={isDisabled}
                onChange={() => onChange(type)}
                className="sr-only"
              />
              <Icon
                aria-hidden="true"
                className={cn('size-4 transition', isActive && 'animate-pop')}
              />
              {t(`posts.type.${type}`)}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
