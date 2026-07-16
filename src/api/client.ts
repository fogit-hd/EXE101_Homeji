import type { ApiError } from './types'
import { NetworkError } from '../lib/errors'
import {
  clearStoredAuth,
  expireStoredAuth,
  readAuthTokenState,
  type AuthTokenState,
} from './authSession'

/**
 * Dev: same-origin → Vite proxy.
 * Production (Render Web Service): same-origin → scripts/serve-prod.mjs proxy → Render API.
 * Chỉ set VITE_API_BASE_URL khi gọi API trực tiếp (cần CORS trên backend).
 */
function resolveApiBase(): string {
  if (import.meta.env.DEV) return ''
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (fromEnv != null && String(fromEnv).trim() !== '') return String(fromEnv).replace(/\/$/, '')
  return ''
}

const API_BASE = resolveApiBase()

export class ApiRequestError extends Error {
  status: number
  body: ApiError

  constructor(status: number, body: ApiError) {
    super(body.detail ?? body.title ?? `Request failed (${status})`)
    this.status = status
    this.body = body
  }
}

function getTokenState(): AuthTokenState {
  return readAuthTokenState()
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('homeji_access_token', token)
  } else {
    localStorage.removeItem('homeji_access_token')
  }
}

export function getStoredSession(): { accessToken: string; userId: string | null; email: string | null } | null {
  const { token: accessToken } = getTokenState()
  if (!accessToken) return null
  return {
    accessToken,
    userId: localStorage.getItem('homeji_user_id'),
    email: localStorage.getItem('homeji_email'),
  }
}

export function persistSession(accessToken: string, userId?: string | null, email?: string | null) {
  setStoredToken(accessToken)
  if (userId) localStorage.setItem('homeji_user_id', userId)
  if (email) localStorage.setItem('homeji_email', email)
}

export function getApiBaseUrl(): string {
  return resolveApiBase()
}

export function clearSession() {
  clearStoredAuth()
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  params?: Record<string, string | number | boolean | string[] | undefined>
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const urlString = path.startsWith('http') ? path : `${API_BASE}${path}`
  const url = urlString.startsWith('http')
    ? new URL(urlString)
    : new URL(urlString, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, item)
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function parseErrorBody(text: string, statusText: string): ApiError {
  if (!text) return { detail: statusText || 'Unknown error' }
  try {
    return (JSON.parse(text) as ApiError) ?? { detail: statusText }
  } catch {
    return { detail: statusText || 'Unknown error' }
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, params } = options
  const tokenState = auth ? getTokenState() : { token: null, expired: false }
  if (auth && !tokenState.token) {
    throw new ApiRequestError(401, {
      detail: tokenState.expired
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Bạn cần đăng nhập để sử dụng chức năng này.',
    })
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (tokenState.token) headers.Authorization = `Bearer ${tokenState.token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Wi‑Fi vẫn bật nhưng API/proxy chết ≠ mất mạng của user
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new NetworkError()
    }
    throw new ApiRequestError(0, {
      detail: 'Không kết nối được máy chủ. Vui lòng thử lại sau.',
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    if (auth && tokenState.token && response.status === 401) {
      expireStoredAuth()
    }
    throw new ApiRequestError(
      response.status,
      (data as ApiError) ?? parseErrorBody(text, response.statusText),
    )
  }

  return data as T
}

/** Multipart upload (do not set Content-Type — browser sets boundary). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options?: { auth?: boolean; params?: RequestOptions['params'] },
): Promise<T> {
  const auth = options?.auth !== false
  const tokenState = auth ? getTokenState() : { token: null, expired: false }
  if (auth && !tokenState.token) {
    throw new ApiRequestError(401, {
      detail: tokenState.expired
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Bạn cần đăng nhập để sử dụng chức năng này.',
    })
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (tokenState.token) headers.Authorization = `Bearer ${tokenState.token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, options?.params), {
      method: 'POST',
      headers,
      body: formData,
    })
  } catch {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new NetworkError()
    }
    throw new ApiRequestError(0, {
      detail: 'Không kết nối được máy chủ. Vui lòng thử lại sau.',
    })
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    if (auth && tokenState.token && response.status === 401) {
      expireStoredAuth()
    }
    throw new ApiRequestError(
      response.status,
      (data as ApiError) ?? parseErrorBody(text, response.statusText),
    )
  }

  return data as T
}

