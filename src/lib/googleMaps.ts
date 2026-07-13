import { importMarkerLibrary } from './loadGoogleMaps'

/** Trung tâm Thủ Đức / Q.9 — khu Làng Đại học */
export const DEFAULT_MAP_CENTER = { lat: 10.8706, lng: 106.7974 }
export const DEFAULT_MAP_ZOOM = 13

/**
 * Fallback Map ID for Advanced Markers / cloud styles.
 * Prefer a real Cloud Map ID via VITE_GOOGLE_MAP_ID.
 */
export const DEFAULT_VECTOR_MAP_ID = 'DEMO_MAP_ID'

export function getGoogleMapsApiKey(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
}

let warnedMissingMapId = false
export function getGoogleMapId(): string {
  const id = (import.meta.env.VITE_GOOGLE_MAP_ID ?? '').trim()
  if (!id) {
    if (!warnedMissingMapId) {
      warnedMissingMapId = true
      console.warn(
        '[Homeji Maps] Set VITE_GOOGLE_MAP_ID to a Cloud Map ID (Vector) for best rendering.',
      )
    }
    return DEFAULT_VECTOR_MAP_ID
  }
  return id
}

/** Resolve Google Maps ColorScheme from OS / UI theme preference. */
export function getMapsColorScheme(): google.maps.ColorScheme | undefined {
  if (typeof window === 'undefined' || typeof google === 'undefined') return undefined
  if (!google.maps?.ColorScheme) return undefined
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? google.maps.ColorScheme.DARK
    : google.maps.ColorScheme.LIGHT
}

/**
 * Google Maps only honors `colorScheme` at Map construction time.
 * Changing theme requires remounting the map (see useSystemMapColorScheme).
 */
export function resolveMapsColorScheme(
  scheme: 'LIGHT' | 'DARK',
): google.maps.ColorScheme | undefined {
  if (typeof google === 'undefined' || !google.maps?.ColorScheme) return undefined
  return scheme === 'DARK'
    ? google.maps.ColorScheme.DARK
    : google.maps.ColorScheme.LIGHT
}

/** @deprecated Post-init setOptions(colorScheme) is a no-op — remount instead. */
export function applyMapsColorScheme(map: google.maps.Map) {
  const scheme = getMapsColorScheme()
  if (!scheme) return
  try {
    map.setOptions({ colorScheme: scheme })
  } catch {
    /* ColorScheme unsupported — ignore */
  }
}

/** Shared MapOptions — official Maps JS API only. */
export function createMapOptions(
  mapId: string = getGoogleMapId(),
  overrides?: Partial<google.maps.MapOptions>,
): google.maps.MapOptions {
  const { colorScheme: overrideScheme, ...rest } = overrides ?? {}
  const colorScheme = overrideScheme ?? getMapsColorScheme()

  return {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    mapId,
    // Must be set at construction — dark/light roadmap theme.
    ...(colorScheme != null ? { colorScheme } : {}),
    disableDefaultUI: true,
    zoomControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    gestureHandling: 'greedy',
    // Allow POI taps; RentalMap stops default Maps popup and shows in-app details.
    clickableIcons: true,
    keyboardShortcuts: false,
    draggable: true,
    scrollwheel: true,
    ...rest,
  }
}

/** @deprecated Use createMapOptions */
export const createVectorMapOptions = createMapOptions

export function isValidCoord(lat: number, lng: number): boolean {
  return lat !== 0 && lng !== 0 && Number.isFinite(lat) && Number.isFinite(lng)
}

/** Load marker library once (AdvancedMarkerElement + PinElement). */
export function loadMarkerLibrary(): Promise<google.maps.MarkerLibrary> {
  return importMarkerLibrary()
}

export type PinStyle = {
  background: string
  borderColor: string
  glyphColor: string
  scale: number
}

export function listingPinStyle(isRoommate: boolean, hot: boolean): PinStyle {
  return {
    background: isRoommate ? '#2ECC71' : '#006491',
    borderColor: hot ? '#00b14f' : '#ffffff',
    glyphColor: '#ffffff',
    scale: hot ? 1.15 : 1,
  }
}

export function selectedPinStyle(): PinStyle {
  return {
    background: '#00b14f',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    scale: 1.35,
  }
}

export function userPinStyle(): PinStyle {
  return {
    background: '#1a73e8',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    scale: 1.05,
  }
}

export function applyPinStyle(
  pin: google.maps.marker.PinElement,
  style: PinStyle,
) {
  pin.background = style.background
  pin.borderColor = style.borderColor
  pin.glyphColor = style.glyphColor
  pin.scale = style.scale
}

export function createStyledPin(
  PinElement: typeof google.maps.marker.PinElement,
  style: PinStyle,
): google.maps.marker.PinElement {
  return new PinElement({
    background: style.background,
    borderColor: style.borderColor,
    glyphColor: style.glyphColor,
    scale: style.scale,
  })
}

/** Pass PinElement itself — `pin.element` is deprecated and can break rendering. */
export function pinContent(
  pin: google.maps.marker.PinElement,
): google.maps.marker.PinElement {
  return pin
}

export function readAdvancedMarkerLatLng(
  marker: google.maps.marker.AdvancedMarkerElement,
): google.maps.LatLngLiteral | null {
  const pos = marker.position
  if (!pos) return null
  if (typeof (pos as google.maps.LatLng).lat === 'function') {
    const ll = pos as google.maps.LatLng
    return { lat: ll.lat(), lng: ll.lng() }
  }
  const lit = pos as google.maps.LatLngLiteral
  return { lat: Number(lit.lat), lng: Number(lit.lng) }
}

export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  if (!address.trim() || typeof google === 'undefined') return null

  try {
    const { Geocoder } = (await google.maps.importLibrary(
      'geocoding',
    )) as google.maps.GeocodingLibrary
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
