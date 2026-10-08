import { importRoutesLibrary } from './loadGoogleMaps'
import { isInHomejiServiceArea } from './homejiServiceArea'

export type CommuteMode = 'DRIVING' | 'WALKING' | 'TRANSIT'
export type CommuteOrigin = { id: string; latitude: number; longitude: number }
export type CommuteResult = { postId: string; durationMillis: number | null; distanceMeters: number | null; error: string | null; mode: CommuteMode; calculatedAt: string; departureAt: string }
export type MatrixItem = { durationMillis?: number | null; distanceMeters?: number; condition?: string | null; error?: unknown }

export function readCommuteItem(postId: string, item: MatrixItem | undefined, mode: CommuteMode, departureAt: string, calculatedAt: string): CommuteResult {
  const valid = item?.condition === 'ROUTE_EXISTS' && !item.error &&
    item.durationMillis != null && Number.isFinite(item.durationMillis) && item.durationMillis > 0 &&
    item.distanceMeters != null && Number.isFinite(item.distanceMeters) && item.distanceMeters >= 0
  return { postId, mode, departureAt, calculatedAt, durationMillis: valid ? item!.durationMillis! : null,
    distanceMeters: valid ? item!.distanceMeters! : null, error: valid ? null : 'Chưa tính được tuyến đường' }
}

/** One explicit user action, at most ten origins × one chosen destination. No device location. */
export async function calculateShortlistCommute(origins: CommuteOrigin[], destination: { lat: number; lng: number }, mode: CommuteMode, departure: Date,
  loadRoutes: () => Promise<Pick<google.maps.RoutesLibrary, 'RouteMatrix'>> = importRoutesLibrary): Promise<CommuteResult[]> {
  if (origins.length < 1 || origins.length > 10 || new Set(origins.map(origin => origin.id)).size !== origins.length ||
    !origins.every(origin => isInHomejiServiceArea(origin.latitude, origin.longitude)) ||
    !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng) || Math.abs(destination.lat) > 90 || Math.abs(destination.lng) > 180 ||
    !['DRIVING', 'WALKING', 'TRANSIT'].includes(mode) || !Number.isFinite(departure.getTime()) || departure.getTime() < Date.now() - 60000)
    throw new Error('Chọn điểm đến, giờ đi và tối đa 10 phòng có tọa độ trong phạm vi Homeji.')
  const { RouteMatrix } = await loadRoutes()
  const { matrix } = await RouteMatrix.computeRouteMatrix({
    origins: origins.map(origin => ({ lat: origin.latitude, lng: origin.longitude })),
    destinations: [destination], travelMode: mode,
    ...(mode === 'WALKING' ? {} : { departureTime: departure }),
    ...(mode === 'DRIVING' ? { routingPreference: 'TRAFFIC_AWARE' as const } : {}),
    fields: ['durationMillis', 'distanceMeters', 'condition', 'error'],
    language: 'vi-VN', region: 'vn',
  })
  const calculatedAt = new Date().toISOString()
  return origins.map((origin, index) => readCommuteItem(origin.id, matrix.rows[index]?.items[0], mode, departure.toISOString(), calculatedAt))
}
