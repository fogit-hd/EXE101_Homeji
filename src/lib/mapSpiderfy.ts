export type SpiderfyCoordinate = { lat: number; lng: number }

const EARTH_METERS_PER_DEGREE = 111_320
const WORLD_METERS_PER_PIXEL = 156_543.03392

function metersPerPixel(latitude: number, zoom: number) {
  return (WORLD_METERS_PER_PIXEL * Math.cos(latitude * Math.PI / 180)) / 2 ** zoom
}

function distanceMeters(a: SpiderfyCoordinate, b: SpiderfyCoordinate) {
  const middleLatitude = (a.lat + b.lat) / 2
  const north = (a.lat - b.lat) * EARTH_METERS_PER_DEGREE
  const east = (a.lng - b.lng)
    * EARTH_METERS_PER_DEGREE
    * Math.cos(middleLatitude * Math.PI / 180)
  return Math.hypot(north, east)
}

export function shouldSpiderfyCluster(positions: SpiderfyCoordinate[], zoom: number) {
  if (positions.length < 2) return false
  if (zoom >= 16) return true
  const origin = positions[0]
  return positions.every((position) => distanceMeters(origin, position) <= 8)
}

export function createSpiderfyPositions(
  center: SpiderfyCoordinate,
  count: number,
  zoom: number,
): SpiderfyCoordinate[] {
  if (count <= 0) return []

  const positions: SpiderfyCoordinate[] = []
  const safeZoom = Math.max(1, zoom)
  const longitudeScale = Math.max(0.2, Math.cos(center.lat * Math.PI / 180))
  let remaining = count
  let ring = 0

  while (remaining > 0) {
    const ringCount = Math.min(remaining, 8)
    const radiusPixels = 48 + ring * 32
    const radiusMeters = radiusPixels * metersPerPixel(center.lat, safeZoom)

    for (let index = 0; index < ringCount; index += 1) {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / ringCount
      const north = Math.sin(angle) * radiusMeters
      const east = Math.cos(angle) * radiusMeters
      positions.push({
        lat: center.lat + north / EARTH_METERS_PER_DEGREE,
        lng: center.lng + east / (EARTH_METERS_PER_DEGREE * longitudeScale),
      })
    }

    remaining -= ringCount
    ring += 1
  }

  return positions
}
