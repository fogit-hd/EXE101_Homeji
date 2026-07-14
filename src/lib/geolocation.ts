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

type GeoPermissionState = PermissionState | 'unknown'

/** Duck-type — `instanceof GeolocationPositionError` often fails across realms. */
function isPositionError(err: unknown): err is GeolocationPositionError {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: unknown }).code
  return typeof code === 'number' && code >= 1 && code <= 3
}

async function queryGeoPermission(): Promise<GeoPermissionState> {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const status = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    })
    return status.state
  } catch {
    return 'unknown'
  }
}

/**
 * Map browser PositionError → app error.
 * Important: Chrome often returns code 1 (PERMISSION_DENIED) when the *site*
 * already allowed Location but Windows blocked the browser / no provider.
 * Only blame the user when Permissions API says `denied`.
 */
function mapGeoError(
  err: GeolocationPositionError,
  permission: GeoPermissionState,
): DeviceLocationError {
  const siteAllowed = permission === 'granted'

  if (err.code === 1 /* PERMISSION_DENIED */) {
    if (siteAllowed) {
      return new DeviceLocationError(
        'unavailable',
        'Trình duyệt đã cho phép vị trí, nhưng Windows/Chrome chưa trả được tọa độ. Bật Location cho Chrome trong Windows Settings, tắt VPN (WARP) rồi thử lại.',
      )
    }
    if (permission === 'denied') {
      return new DeviceLocationError(
        'denied',
        'Bạn đã từ chối quyền vị trí.',
      )
    }
    // prompt / unknown — user may have dismissed the prompt once
    return new DeviceLocationError(
      'denied',
      'Chưa có quyền vị trí.',
    )
  }

  if (err.code === 3 /* TIMEOUT */) {
    return new DeviceLocationError(
      'timeout',
      'Không lấy được vị trí kịp thời. Thử lại sau vài giây.',
    )
  }

  return new DeviceLocationError(
    'unavailable',
    'Không lấy được vị trí thiết bị. Kiểm tra Location của Windows đang bật, rồi thử lại.',
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

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

/**
 * First fix via watchPosition (closer to Google Maps) — often succeeds on
 * desktop/Wi‑Fi when a single getCurrentPosition(highAccuracy) fails.
 */
function watchFirstFix(
  options: PositionOptions,
  source: DeviceLocationSource,
): Promise<DeviceLocation> {
  const timeoutMs = options.timeout ?? 20_000
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      navigator.geolocation.clearWatch(watchId)
      fn()
    }

    const timer = window.setTimeout(() => {
      finish(() =>
        reject(
          Object.assign(new Error('Timeout expired'), {
            code: 3,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          }),
        ),
      )
    }, timeoutMs)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        finish(() => resolve(fromPosition(pos, source)))
      },
      (err) => {
        finish(() => reject(err))
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        maximumAge: options.maximumAge,
        timeout: timeoutMs,
      },
    )
  })
}

/**
 * Browser geolocation only (same API Google Maps uses in Chrome).
 * Never IP. Prefer watch-first, then low-accuracy getCurrentPosition.
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

  const permission = await queryGeoPermission()
  if (permission === 'denied') {
    throw new DeviceLocationError(
      'denied',
      'Bạn đã từ chối quyền vị trí.',
    )
  }

  let lastError: DeviceLocationError | null = null

  const attempts: Array<() => Promise<DeviceLocation>> = [
    () =>
      getPosition({
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 300_000,
      }).then((pos) => fromPosition(pos, 'cached')),
    () =>
      watchFirstFix(
        {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 60_000,
        },
        'gps',
      ),
    () =>
      getPosition({
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 600_000,
      }).then((pos) => fromPosition(pos, 'network')),
  ]

  for (const attempt of attempts) {
    if (signal?.aborted) {
      throw new DeviceLocationError('unavailable', 'Đã hủy lấy vị trí.')
    }
    try {
      return await attempt()
    } catch (err) {
      if (isPositionError(err)) {
        lastError = mapGeoError(err, permission)
        // Only stop early when the *site* permission is really denied.
        // (permission === 'denied' already returned above; here we still honor
        // PositionError PERMISSION_DENIED without retrying other strategies.)
        if (lastError.code === 'denied') throw lastError
        continue
      }
      lastError = new DeviceLocationError(
        'unavailable',
        'Không lấy được vị trí thiết bị. Thử lại sau vài giây.',
      )
    }
  }

  throw (
    lastError ??
    new DeviceLocationError(
      'unavailable',
      'Không lấy được vị trí thiết bị. Kiểm tra Location của Windows đang bật, rồi thử lại.',
    )
  )
}
