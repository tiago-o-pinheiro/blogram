import { MapPin } from 'lucide-react'

import { type Models } from '@/models'

type PostPlaceProps = { place?: Models.PostPlace }

export const PostPlace = ({ place }: PostPlaceProps) =>
  place ? (
    <a
      href={
        place.mapUrl ??
        `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.name)}`
      }
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <MapPin
        aria-hidden="true"
        className="size-4 shrink-0 transition group-hover:-translate-y-0.5 motion-reduce:translate-none"
      />
      <span className="break-words">{place.name}</span>
    </a>
  ) : null
