import { Skeleton } from '@/design-system/ui/skeleton'

const Loading = () => (
  <div
    className="mx-auto flex w-full max-w-2xl animate-fade-in flex-col gap-6 p-6"
    aria-busy="true"
  >
    <Skeleton className="h-9 w-48" />
    <Skeleton className="aspect-video w-full" />
    <Skeleton className="h-11 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-11 w-36" />
  </div>
)

export default Loading
