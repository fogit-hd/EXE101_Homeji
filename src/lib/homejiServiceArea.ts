/**
 * Broad operating bounds for Homeji's Thu Duc / former District 9 demo area.
 * The box also includes the VNUHCM Student Cultural House in Dong Hoa.
 */
export const HOMEJI_SERVICE_AREA = {
  minLatitude: 10.7,
  maxLatitude: 10.93,
  minLongitude: 106.72,
  maxLongitude: 106.9,
} as const

export function isInHomejiServiceArea(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= HOMEJI_SERVICE_AREA.minLatitude &&
    latitude <= HOMEJI_SERVICE_AREA.maxLatitude &&
    longitude >= HOMEJI_SERVICE_AREA.minLongitude &&
    longitude <= HOMEJI_SERVICE_AREA.maxLongitude
  )
}
