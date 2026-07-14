import { getGoogleMapsApiKey } from './googleMaps'

/**
 * Street View Static API — preview image for place detail panel.
 * Requires Street View Static API enabled on the key.
 */
export function streetViewStaticUrl(
  loc: { lat: number; lng: number },
  options?: { width?: number; height?: number; heading?: number; pitch?: number; fov?: number },
): string | null {
  const key = getGoogleMapsApiKey()
  if (!key) return null
  const w = options?.width ?? 640
  const h = options?.height ?? 360
  const params = new URLSearchParams({
    size: `${w}x${h}`,
    location: `${loc.lat},${loc.lng}`,
    key,
    return_error_code: 'true',
  })
  if (options?.heading != null) params.set('heading', String(options.heading))
  if (options?.pitch != null) params.set('pitch', String(options.pitch))
  if (options?.fov != null) params.set('fov', String(options.fov))
  return `https://maps.googleapis.com/maps/api/streetview?${params}`
}

/**
 * Maps Static API — thumbnail for chat shared locations / share cards.
 * Requires Maps Static API enabled on the key.
 */
export function staticMapUrl(
  loc: { lat: number; lng: number },
  options?: { width?: number; height?: number; zoom?: number; scale?: 1 | 2 },
): string | null {
  const key = getGoogleMapsApiKey()
  if (!key) return null
  const w = options?.width ?? 400
  const h = options?.height ?? 200
  const zoom = options?.zoom ?? 15
  const scale = options?.scale ?? 2
  const params = new URLSearchParams({
    size: `${w}x${h}`,
    scale: String(scale),
    zoom: String(zoom),
    center: `${loc.lat},${loc.lng}`,
    maptype: 'roadmap',
    key,
    markers: `color:0x1A73E8|${loc.lat},${loc.lng}`,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}
