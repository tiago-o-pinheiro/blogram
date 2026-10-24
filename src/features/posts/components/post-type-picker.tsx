'use client'

import { CirclePlay, ImageIcon, LinkIcon, type LucideIcon, Newspaper, Video } from 'lucide-react'

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
      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {Models.POST_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type]

          return (
            <label
              key={type}
              className="flex min-h-11 min-w-24 flex-1 press cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:opacity-disabled motion-reduce:transition-none"
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
              <Icon aria-hidden="true" className="size-4" />
              {t(`posts.type.${type}`)}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
