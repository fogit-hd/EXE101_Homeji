/**
 * Guest explore URL state.
 * Uses `eq` / `er` — not `q` / `r` — because `q` already means marketplace keyword
 * on `/` via SearchContext (`section=marketplace`).
 */
export const EXPLORE_QUERY_PARAM = 'eq'
export const EXPLORE_RADIUS_PARAM = 'er'

export const EXPLORE_RADIUS_OPTIONS = [1, 2, 3] as const
export type ExploreRadiusKm = (typeof EXPLORE_RADIUS_OPTIONS)[number]

export function parseExploreRadius(raw: string | null | undefined, fallback: ExploreRadiusKm = 2): ExploreRadiusKm {
  const value = Number(raw)
  return EXPLORE_RADIUS_OPTIONS.includes(value as ExploreRadiusKm)
    ? (value as ExploreRadiusKm)
    : fallback
}

export function readExploreUrlState(params: URLSearchParams): {
  query: string
  radiusKm: ExploreRadiusKm
} {
  return {
    query: (params.get(EXPLORE_QUERY_PARAM) ?? '').trim(),
    radiusKm: parseExploreRadius(params.get(EXPLORE_RADIUS_PARAM)),
  }
}

/** Writes eq/er while preserving every other search param. */
export function writeExploreUrlState(
  params: URLSearchParams,
  next: { query?: string | null; radiusKm?: ExploreRadiusKm | null },
): URLSearchParams {
  const out = new URLSearchParams(params)
  if ('query' in next) {
    const q = next.query?.trim() ?? ''
    if (q) out.set(EXPLORE_QUERY_PARAM, q)
    else out.delete(EXPLORE_QUERY_PARAM)
  }
  if ('radiusKm' in next) {
    if (next.radiusKm == null) out.delete(EXPLORE_RADIUS_PARAM)
    else out.set(EXPLORE_RADIUS_PARAM, String(next.radiusKm))
  }
  return out
}
