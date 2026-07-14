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

/**
 * Chỉ nhận diện lỗi thật sự liên quan mạng / không tới được server.
 * Không được coi mọi TypeError (vd. crash render) là mất mạng.
 */
function isNetworkLike(err: unknown): boolean {
  if (err instanceof NetworkError) return true

  if (err instanceof Error) {
    if (err.name === 'NetworkError') return true
    // Abort từ timeout request — không phải mất Wi‑Fi; để caller xử lý riêng
    if (err.name === 'AbortError') return false

    const msg = err.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror when attempting to fetch') ||
      msg.includes('network request failed') ||
      msg.includes('load failed') ||
      msg.includes('err_network') ||
      msg.includes('err_internet_disconnected') ||
      msg.includes('err_connection_refused') ||
      msg.includes('err_connection_reset') ||
      msg.includes('err_connection_timed_out') ||
      msg.includes('err_name_not_resolved') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('etimedout') ||
      msg.includes('ecconnreset')
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

export const PROFILE_INCOMPLETE_MESSAGE =
  'Vui lòng hoàn thiện hồ sơ trước khi dùng tính năng này.'

export const REVIEW_REQUIRES_VIEWING_MESSAGE =
  'Bạn cần hoàn tất lịch xem phòng trước khi đánh giá tin này.'

export const REVIEW_OWN_POST_MESSAGE =
  'Bạn không thể đánh giá tin đăng của chính mình.'

export const RATE_LIMIT_MESSAGE =
  'Bạn thao tác hơi nhanh. Vui lòng đợi vài giây rồi thử lại.'

/**
 * Đổi mọi lỗi kỹ thuật thành 2 nhóm thông báo thân thiện:
 * - Mạng → kiểm tra kết nối
 * - Server / API / crash React / … → lỗi hệ thống
 * - Lỗi validate phía client (không phải API) → giữ nguyên / fallback
 */
export function getErrorMessage(err?: unknown, fallback?: string): string {
  if (isNetworkLike(err)) return NETWORK_ERROR_MESSAGE
  if (err instanceof ApiRequestError) {
    if (err.status === 429) return RATE_LIMIT_MESSAGE
    if (err.status === 403) {
      const detail = (err.body.detail || err.message || '').toLowerCase()
      // Match real profile gate only — not other "Complete …" 403s (e.g. viewing appointment).
      if (
        detail.includes('complete your profile') ||
        detail.includes('hồ sơ') ||
        (detail.includes('profile') && detail.includes('before using'))
      ) {
        return PROFILE_INCOMPLETE_MESSAGE
      }
      if (
        detail.includes('viewing appointment') ||
        detail.includes('before reviewing')
      ) {
        return REVIEW_REQUIRES_VIEWING_MESSAGE
      }
      if (
        detail.includes('cannot review their own') ||
        detail.includes('own rental post')
      ) {
        return REVIEW_OWN_POST_MESSAGE
      }
      return err.body.detail || 'Bạn không có quyền thực hiện thao tác này.'
    }
    if (isSystemApiError(err)) {
      const detail = err.body.detail
      if (detail && !isTechnicalMessage(detail)) return detail
      return SYSTEM_ERROR_MESSAGE
    }
    const fromErrors = firstValidationMessage(err.body.errors)
    if (fromErrors && !isTechnicalMessage(fromErrors)) return fromErrors
    if (err.body.detail && !isTechnicalMessage(err.body.detail)) return err.body.detail
    return SYSTEM_ERROR_MESSAGE
  }
  if (err instanceof Error && err.message && !isTechnicalMessage(err.message)) {
    return err.message
  }
  return fallback || SYSTEM_ERROR_MESSAGE
}

function firstValidationMessage(errors?: Record<string, string[]>): string | null {
  if (!errors) return null
  for (const messages of Object.values(errors)) {
    const first = messages?.find((m) => typeof m === 'string' && m.trim())
    if (first) return first.trim()
  }
  return null
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
