const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FULL_NAME_CHARACTERS_RE = /^[\p{L}\p{M}' -]+$/u
const VIETNAM_PHONE_RE = /^0\d{9}$/

export const USER_INPUT_LIMITS = {
  fullName: 60,
  email: 254,
  phone: 10,
} as const

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function validateFullName(value: string): string | null {
  const normalized = normalizeFullName(value)
  if (!normalized) return 'Vui lòng nhập họ tên.'
  if (normalized.length < 2 || normalized.length > USER_INPUT_LIMITS.fullName) {
    return `Họ tên phải từ 2 đến ${USER_INPUT_LIMITS.fullName} ký tự.`
  }
  if (!FULL_NAME_CHARACTERS_RE.test(normalized)) {
    return 'Họ tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy hoặc dấu gạch nối.'
  }
  if (normalized.split(' ').length < 2) {
    return 'Vui lòng nhập đầy đủ họ và tên.'
  }
  return null
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function validateRegistrationEmail(value: string): string | null {
  const normalized = normalizeEmail(value)
  if (!EMAIL_FORMAT_RE.test(normalized)) return 'Email chưa đúng định dạng.'
  if (!normalized.endsWith('@gmail.com')) return 'Vui lòng sử dụng địa chỉ Gmail (@gmail.com).'
  if (normalized.length > USER_INPUT_LIMITS.email) return 'Email quá dài.'
  return null
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, USER_INPUT_LIMITS.phone)
}

export function validateVietnamPhone(value: string): string | null {
  if (!value) return null
  return VIETNAM_PHONE_RE.test(value)
    ? null
    : 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.'
}
