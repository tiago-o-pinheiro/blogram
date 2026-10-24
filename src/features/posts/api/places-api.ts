import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

import { PostsApiError } from './posts-api'

export const searchPlaces = async (
  query: Models.PlaceSearchQuery,
  signal: AbortSignal,
): Promise<Models.PlaceSuggestion[]> => {
  const params = new URLSearchParams({ q: query.q, lang: query.lang ?? 'en' })
  const response = await fetch(`${API_URL}/admin/places?${params.toString()}`, {
    credentials: 'same-origin',
    signal,
  })
  const body: unknown = response.ok ? await response.json() : null
  if (!Models.isPlaceSuggestionList(body)) {
    throw new PostsApiError(response.status)
  }
  return body.data
}
