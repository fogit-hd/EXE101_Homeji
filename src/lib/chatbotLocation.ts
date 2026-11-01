export type ChatbotLocation = { latitude: number; longitude: number; address: string | null; capturedAt: string; accuracyMeters?: number | null }
export function freshChatbotLocation(value: ChatbotLocation | null | undefined, now = Date.now()): ChatbotLocation | undefined {
  if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180 || value.latitude === 0 && value.longitude === 0) return undefined
  const captured = Date.parse(value.capturedAt)
  return Number.isFinite(captured) && captured <= now + 60000 && captured >= now - 15 * 60000 ? value : undefined
}

export async function locateForChat(): Promise<ChatbotLocation> {
  if (!navigator.geolocation) throw new Error('Thiết bị chưa hỗ trợ vị trí. Bạn có thể chọn địa chỉ thay thế.')
  const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Chưa lấy được vị trí. Cho phép quyền vị trí hoặc chọn địa chỉ bên dưới.')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }))
  const point = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, capturedAt: new Date().toISOString(), address: null as string | null }
  if (!freshChatbotLocation(point)) throw new Error('Vị trí thiết bị không hợp lệ. Hãy chọn một địa chỉ.')
  if (typeof google !== 'undefined' && google.maps?.importLibrary) {
    try {
      const { Geocoder } = await google.maps.importLibrary('geocoding') as google.maps.GeocodingLibrary
      const response = await new Geocoder().geocode({ location: { lat: point.latitude, lng: point.longitude } })
      point.address = response.results[0]?.formatted_address?.slice(0, 500) || null
    } catch { /* Coordinates still support nearby search; the user can select a street address for posting. */ }
  }
  return point
}
