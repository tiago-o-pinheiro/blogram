import { Skeleton } from '@/design-system/ui/skeleton'

const Loading = () => (
  <main
    className="mx-auto flex min-h-dvh max-w-2xl animate-fade-in flex-col items-center gap-6 px-4 py-16"
    aria-busy="true"
  >
    <Skeleton className="size-24 rounded-full" />
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-5 w-64" />
    <Skeleton className="mt-8 h-12 w-full rounded-full" />
    <Skeleton className="aspect-square w-full rounded-lg" />
  </main>
)

export default Loading
