import { type Models } from '@/models'

const EARTH_RADIUS_KM = 6371
const SAME_SPOT_KM = 5
const SAME_NAME_KM = 50

export type PlaceGroup = {
  name: string
  coordinates: Models.PlaceCoordinates | null
  count: number
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

const toDistanceKm = (from: Models.PlaceCoordinates, to: Models.PlaceCoordinates): number => {
  const latitude = toRadians(to.lat - from.lat)
  const longitude = toRadians(to.lon - from.lon)
  const haversine =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(longitude / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

const toNameTokens = (name: string): string[] => {
  const parts = name
    .split(',')
    .map((part) =>
      part
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLocaleLowerCase('en'),
    )
    .filter((part) => part !== '')
  return parts.length > 1 ? parts.slice(0, -1) : parts
}

const sharesName = (cluster: readonly PlaceGroup[], candidate: PlaceGroup): boolean => {
  const tokens = new Set(cluster.flatMap((group) => toNameTokens(group.name)))
  return toNameTokens(candidate.name).some((token) => tokens.has(token))
}

const isNear = (cluster: readonly PlaceGroup[], candidate: PlaceGroup): boolean => {
  const anchor = cluster[0]?.coordinates
  if (!anchor || !candidate.coordinates) {
    return false
  }
  const distance = toDistanceKm(anchor, candidate.coordinates)
  return distance <= SAME_SPOT_KM || (distance <= SAME_NAME_KM && sharesName(cluster, candidate))
}

const toTotal = (cluster: readonly PlaceGroup[]): number =>
  cluster.reduce((sum, group) => sum + group.count, 0)

export const groupPlaces = <T extends PlaceGroup>(groups: readonly T[]): T[][] => {
  const positions = new Map(groups.map((group, index) => [group, index]))
  const toPosition = (group: T): number => positions.get(group) ?? Infinity
  const ranked = groups.toSorted((left, right) => right.count - left.count)
  const clusters: T[][] = []
  for (const group of ranked.filter((candidate) => candidate.coordinates !== null)) {
    const cluster = clusters.find((candidate) => isNear(candidate, group))
    if (cluster) {
      cluster.push(group)
    } else {
      clusters.push([group])
    }
  }
  for (const group of ranked.filter((candidate) => candidate.coordinates === null)) {
    const [cluster] = clusters
      .filter((candidate) => sharesName(candidate, group))
      .toSorted((left, right) => toTotal(right) - toTotal(left))
    if (cluster) {
      cluster.push(group)
    } else {
      clusters.push([group])
    }
  }
  const toLeadFirst = (cluster: readonly T[]): T[] => {
    const totals = new Map<string, number>()
    cluster.forEach((group) => totals.set(group.name, (totals.get(group.name) ?? 0) + group.count))
    const byRecency = cluster.toSorted((left, right) => toPosition(left) - toPosition(right))
    const [lead] = byRecency.toSorted(
      (left, right) =>
        (totals.get(right.name) ?? 0) - (totals.get(left.name) ?? 0) ||
        Number(right.coordinates !== null) - Number(left.coordinates !== null) ||
        right.count - left.count,
    )
    return lead ? [lead, ...byRecency.filter((group) => group !== lead)] : byRecency
  }
  const toNewest = (cluster: readonly T[]): number => Math.min(...cluster.map(toPosition))
  return clusters.toSorted((left, right) => toNewest(left) - toNewest(right)).map(toLeadFirst)
}
