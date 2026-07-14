import { importRoutesLibrary } from './loadGoogleMaps'
import { isValidCoord } from './googleMaps'

export type MapRouteStep = {
  instruction: string
  distanceText: string
  maneuver: string | null
}

export type MapRouteSummary = {
  distanceMeters: number
  durationMillis: number
  distanceText: string
  durationText: string
  steps: MapRouteStep[]
  trafficAware: boolean
  mode: 'preview' | 'navigate'
}

export type MapRouteResult = MapRouteSummary & {
  path: google.maps.LatLngLiteral[]
  viewport: google.maps.LatLngBounds | null
  /** Keep the Route instance so the map can call createPolylines. */
  route: google.maps.routes.Route
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0).replace('.', ',')} km`
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`
}

function readCoord(value: number | (() => number)): number {
  return typeof value === 'function' ? value() : Number(value)
}

/** Routes API path points may be LatLng, LatLngAltitude, or plain {lat,lng}. */
function toLiteral(
  p:
    | google.maps.LatLngAltitude
    | google.maps.LatLng
    | google.maps.LatLngLiteral
    | { lat: number | (() => number); lng: number | (() => number) },
): google.maps.LatLngLiteral {
  return {
    lat: readCoord(p.lat as number | (() => number)),
    lng: readCoord(p.lng as number | (() => number)),
  }
}

function stripHtml(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim()
}

function extractRouteSteps(route: google.maps.routes.Route): MapRouteStep[] {
  const out: MapRouteStep[] = []
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const instruction = step.instructions?.trim()
      if (!instruction) continue
      const distanceMeters = step.distanceMeters ?? 0
      out.push({
        instruction,
        distanceText:
          step.localizedValues?.distance?.trim() || formatDistance(distanceMeters),
        maneuver: step.maneuver ?? null,
      })
    }
  }
  return out
}

/** Fallback when Routes `legs.steps.instructions` is empty. */
async function fetchDirectionsSteps(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<MapRouteStep[]> {
  const service = new google.maps.DirectionsService()
  const result = await service.route({
    origin,
    destination,
    travelMode: google.maps.TravelMode.DRIVING,
    language: 'vi',
    region: 'VN',
    provideRouteAlternatives: false,
  })
  const steps = result.routes[0]?.legs?.[0]?.steps ?? []
  const out: MapRouteStep[] = []
  for (const step of steps) {
    const instruction = stripHtml(step.instructions || '')
    if (!instruction) continue
    out.push({
      instruction,
      distanceText: step.distance?.text?.trim() || formatDistance(step.distance?.value ?? 0),
      maneuver: step.maneuver ?? null,
    })
  }
  return out
}

/**
 * Driving route via Maps JS Routes library (Routes API).
 * Draws on Homeji map — does not open google.com/maps.
 */
export async function computeDrivingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options?: { trafficAware?: boolean; mode?: 'preview' | 'navigate' },
): Promise<MapRouteResult> {
  if (!isValidCoord(origin.lat, origin.lng) || !isValidCoord(destination.lat, destination.lng)) {
    throw new Error('Tọa độ điểm đi/đến không hợp lệ')
  }

  const { Route } = await importRoutesLibrary()
  const trafficAware = options?.trafficAware !== false
  const mode = options?.mode ?? (trafficAware ? 'navigate' : 'preview')

  const { routes } = await Route.computeRoutes({
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    travelMode: 'DRIVING',
    routingPreference: trafficAware ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
    language: 'vi',
    region: 'vn',
    fields: [
      'path',
      'distanceMeters',
      'durationMillis',
      'staticDurationMillis',
      'viewport',
      'legs',
      'localizedValues',
    ],
  })

  const route = routes?.[0]
  if (!route?.path?.length) {
    throw new Error('Không tìm được đường đi')
  }

  const path = route.path.map(toLiteral).filter((p) => isValidCoord(p.lat, p.lng))
  if (path.length === 0) {
    throw new Error('Không tìm được đường đi')
  }

  let steps = extractRouteSteps(route)
  if (steps.length === 0) {
    try {
      steps = await fetchDirectionsSteps(origin, destination)
    } catch {
      steps = []
    }
  }

  const distanceMeters = route.distanceMeters ?? 0
  const durationMillis =
    route.durationMillis ?? route.staticDurationMillis ?? 0
  const localized = route.localizedValues

  return {
    route,
    path,
    viewport: route.viewport ?? null,
    distanceMeters,
    durationMillis,
    distanceText: localized?.distance?.trim() || formatDistance(distanceMeters),
    durationText: localized?.duration?.trim() || formatDuration(durationMillis),
    steps,
    trafficAware,
    mode,
  }
}

/** Simple glyph for common maneuver codes from Routes / Directions. */
export function maneuverGlyph(maneuver: string | null | undefined): string {
  const key = (maneuver || '').toUpperCase()
  if (key.includes('LEFT') && key.includes('U')) return '↶'
  if (key.includes('RIGHT') && key.includes('U')) return '↷'
  if (key.includes('LEFT')) return '↰'
  if (key.includes('RIGHT')) return '↱'
  if (key.includes('MERGE')) return '⤴'
  if (key.includes('ROUNDABOUT') || key.includes('FORK')) return '↻'
  if (key.includes('STRAIGHT') || key.includes('CONTINUE') || key.includes('NAME_CHANGE')) return '↑'
  if (key.includes('DEPART') || key.includes('FERRY')) return '●'
  if (key.includes('ARRIVE')) return '◎'
  return '→'
}
