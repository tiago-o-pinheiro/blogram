import { cn } from '@/design-system/ui/lib/cn'
import type * as Models from '@/models/models'

type PostStatusBadgeProps = {
  status: Models.PostStatus
  label: string
}

export const PostStatusBadge = ({ status, label }: PostStatusBadgeProps) => (
  <span
    className={cn(
      'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
      status === 'published'
        ? 'bg-accent text-accent-foreground'
        : 'bg-muted text-muted-foreground',
    )}
  >
    {label}
  </span>
)
