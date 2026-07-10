/** Trung tâm Thủ Đức / Q.9 — khu Làng Đại học */
export const DEFAULT_MAP_CENTER = { lat: 10.8706, lng: 106.7974 }
export const DEFAULT_MAP_ZOOM = 13

export function getGoogleMapsApiKey(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
}

/** Chỉ truyền mapId khi đã tạo Map ID riêng trên Google Cloud. */
export function getGoogleMapId(): string | undefined {
  const id = (import.meta.env.VITE_GOOGLE_MAP_ID ?? '').trim()
  if (!id || id === 'DEMO_MAP_ID') return undefined
  return id
}

export function isValidCoord(lat: number, lng: number): boolean {
  return lat !== 0 && lng !== 0 && Number.isFinite(lat) && Number.isFinite(lng)
}

export function markerColorForType(isRoommateShare: boolean): string {
  return isRoommateShare ? '#2ECC71' : '#006491'
}

export function createMarkerIcon(
  color: string,
  scale: number,
  selected = false,
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? scale + 3 : scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: selected ? '#00b14f' : '#ffffff',
    strokeWeight: selected ? 3 : 2,
  }
}

export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  if (!address.trim() || typeof google === 'undefined') return null

  try {
    const { Geocoder } = (await google.maps.importLibrary('geocoding')) as google.maps.GeocodingLibrary
    const geocoder = new Geocoder()
    const { results } = await geocoder.geocode({ address, region: 'vn' })
    const result = results?.[0]
    const location = result?.geometry?.location
    if (!location) return null

    return {
      lat: location.lat(),
      lng: location.lng(),
      formattedAddress: result.formatted_address ?? address,
    }
  } catch {
    return null
  }
}
