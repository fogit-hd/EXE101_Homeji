export type DeviceLocationSource = 'gps' | 'network' | 'cached'

export type DeviceLocation = {
  lat: number
  lng: number
  accuracyMeters?: number
  source: DeviceLocationSource
}

export class DeviceLocationError extends Error {
  readonly code: 'unsupported' | 'insecure' | 'denied' | 'timeout' | 'unavailable'

  constructor(code: DeviceLocationError['code'], message: string) {
    super(message)
    this.name = 'DeviceLocationError'
    this.code = code
  }
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

function mapGeoError(err: GeolocationPositionError): DeviceLocationError {
  if (err.code === err.PERMISSION_DENIED) {
    return new DeviceLocationError(
      'denied',
      'Bạn đã từ chối quyền vị trí. Bấm ổ khóa cạnh URL → Cho phép Vị trí.',
    )
  }
  if (err.code === err.TIMEOUT) {
    return new DeviceLocationError(
      'timeout',
      'Không lấy được vị trí kịp thời. Thử lại sau vài giây.',
    )
  }
  return new DeviceLocationError(
    'unavailable',
    'Không lấy được vị trí thiết bị. Cho phép Location trong trình duyệt rồi thử lại.',
  )
}

function fromPosition(
  pos: GeolocationPosition,
  source: DeviceLocationSource,
): DeviceLocation {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracyMeters: pos.coords.accuracy,
    source,
  }
}

/**
 * Browser geolocation only (Google Maps style) — never IP.
 * Order: recent cache → high accuracy → network.
 */
export async function getDeviceLocation(options?: {
  signal?: AbortSignal
}): Promise<DeviceLocation> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new DeviceLocationError(
      'insecure',
      'Định vị chỉ hoạt động trên HTTPS hoặc localhost.',
    )
  }
  if (!navigator.geolocation) {
    throw new DeviceLocationError('unsupported', 'Trình duyệt không hỗ trợ định vị.')
  }

  const signal = options?.signal
  if (signal?.aborted) {
    throw new DeviceLocationError('unavailable', 'Đã hủy lấy vị trí.')
  }

  let lastError: DeviceLocationError | null = null

  // 1) Prefer a fresh-enough cached fix so re-clicks feel instant (like Google Maps).
  try {
    const pos = await getPosition({
      enableHighAccuracy: false,
      timeout: 4_000,
      maximumAge: 120_000,
    })
    return fromPosition(pos, 'cached')
  } catch (err) {
    if (err instanceof GeolocationPositionError) {
      lastError = mapGeoError(err)
      if (lastError.code === 'denied') throw lastError
    }
  }

  if (signal?.aborted) {
    throw new DeviceLocationError('unavailable', 'Đã hủy lấy vị trí.')
  }

  // 2) High accuracy (GPS / Windows location provider).
  try {
    const pos = await getPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 30_000,
    })
    return fromPosition(pos, 'gps')
  } catch (err) {
    if (err instanceof GeolocationPositionError) {
      lastError = mapGeoError(err)
      if (lastError.code === 'denied') throw lastError
    }
  }

  if (signal?.aborted) {
    throw new DeviceLocationError('unavailable', 'Đã hủy lấy vị trí.')
  }

  // 3) Network / Wi‑Fi without requiring a brand-new fix.
  try {
    const pos = await getPosition({
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 600_000,
    })
    return fromPosition(pos, 'network')
  } catch (err) {
    if (err instanceof GeolocationPositionError) {
      lastError = mapGeoError(err)
      if (lastError.code === 'denied') throw lastError
    }
  }

  throw (
    lastError ??
    new DeviceLocationError(
      'unavailable',
      'Không lấy được vị trí thiết bị. Cho phép Location trong trình duyệt rồi thử lại.',
    )
  )
}
