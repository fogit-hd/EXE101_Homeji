import { ApiRequestError } from '../api/client'

/** Lỗi mất mạng / không gọi được server */
export class NetworkError extends Error {
  constructor(message = NETWORK_ERROR_MESSAGE) {
    super(message)
    this.name = 'NetworkError'
  }
}

export const NETWORK_ERROR_MESSAGE =
  'Đã mất kết nối mạng. Vui lòng kiểm tra lại kết nối rồi thử lại.'

export const SYSTEM_ERROR_MESSAGE =
  'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'

function isNetworkLike(err: unknown): boolean {
  if (err instanceof NetworkError) return true
  if (err instanceof TypeError) return true

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      err.name === 'NetworkError' ||
      err.name === 'AbortError' ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      msg.includes('load failed') ||
      msg.includes('err_network') ||
      msg.includes('err_internet_disconnected') ||
      msg.includes('err_connection') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('etimedout') ||
      msg.includes('network')
    )
  }

  return false
}

/** Lỗi từ phía server / API (5xx, timeout, quá tải, …) */
export function isSystemApiError(err: unknown): boolean {
  if (!(err instanceof ApiRequestError)) return false
  const s = err.status
  return s === 0 || s === 408 || s === 429 || s >= 500
}

/**
 * Lỗi cần giữ loading + retry đến khi hết sự cố
 * (mất mạng / server down / 5xx…) — không hiện trang trống.
 */
export function isServiceDisruption(err: unknown): boolean {
  return isNetworkLike(err) || isSystemApiError(err)
}

/**
 * Đổi mọi lỗi kỹ thuật thành 2 nhóm thông báo thân thiện:
 * - Mạng → kiểm tra kết nối
 * - Server / API / crash React / … → lỗi hệ thống
 * - Lỗi validate phía client (không phải API) → giữ nguyên / fallback
 */
export function getErrorMessage(err?: unknown, fallback?: string): string {
  if (isNetworkLike(err)) return NETWORK_ERROR_MESSAGE
  if (isSystemApiError(err)) return SYSTEM_ERROR_MESSAGE
  // API 4xx khác (404/400/403…) — vẫn quy về lỗi hệ thống cho người dùng cuối
  if (err instanceof ApiRequestError) return SYSTEM_ERROR_MESSAGE
  if (err instanceof Error && err.message && !isTechnicalMessage(err.message)) {
    return err.message
  }
  return fallback || SYSTEM_ERROR_MESSAGE
}

function isTechnicalMessage(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('request failed') ||
    m.includes('internal server') ||
    m.includes('not found') ||
    m.includes('bad gateway') ||
    m.includes('service unavailable') ||
    m.includes('gateway timeout') ||
    m.includes('http') ||
    m.includes('must be used within') ||
    m.includes('is not defined') ||
    m.includes('cannot read') ||
    m.includes('cannot access') ||
    m.includes('unexpected token') ||
    m.includes('chunkloaderror') ||
    m.includes('loading chunk') ||
    m.includes('minified react error') ||
    (m.includes('render') && m.includes('error')) ||
    m.includes('invalid hook') ||
    m.includes('authprovider') ||
    m.includes('useauth') ||
    m.includes('typeerror') ||
    m.includes('referenceerror') ||
    /\b(404|500|502|503|504)\b/.test(m)
  )
}
