/** Map pin layers the user can toggle beside the search bar. */
export type MapPinLayer = 'vacant' | 'roommate' | 'marketplace'

export type MapPinLayers = Record<MapPinLayer, boolean>

export const DEFAULT_MAP_PIN_LAYERS: MapPinLayers = {
  vacant: true,
  roommate: false,
  marketplace: false,
}

// Start the refreshed map experience with rentals only. After the user opts in
// to another layer, their choice is persisted as before.
const STORAGE_KEY = 'homeji:map-pin-layers:v2'

export const MAP_PIN_LAYER_OPTIONS: {
  id: MapPinLayer
  label: string
  /** Accent used on active chip */
  accent: string
}[] = [
  { id: 'vacant', label: 'Phòng trọ', accent: '#84CC16' },
  { id: 'roommate', label: 'Ở ghép', accent: '#6366F1' },
  { id: 'marketplace', label: 'Chợ đồ', accent: '#F59E0B' },
]

function isLayers(value: unknown): value is MapPinLayers {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.vacant === 'boolean' &&
    typeof o.roommate === 'boolean' &&
    typeof o.marketplace === 'boolean'
  )
}

/** Restore last layer visibility (survives refresh / reopen browser). */
export function loadMapPinLayers(): MapPinLayers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_MAP_PIN_LAYERS }
    const parsed: unknown = JSON.parse(raw)
    if (!isLayers(parsed)) return { ...DEFAULT_MAP_PIN_LAYERS }
    return {
      vacant: parsed.vacant,
      roommate: parsed.roommate,
      marketplace: parsed.marketplace,
    }
  } catch {
    return { ...DEFAULT_MAP_PIN_LAYERS }
  }
}

export function saveMapPinLayers(layers: MapPinLayers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layers))
  } catch {
    /* quota / private mode — ignore */
  }
}
