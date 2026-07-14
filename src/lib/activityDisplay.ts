import type { UserActivity } from '../api'
import { UserActivityType } from '../api/types'
import { formatPrice } from './labels'

export interface ActivityDisplay {
  title: string
  description: string | null
}

type PathRule = {
  method?: string | string[]
  match: RegExp
  title: string | ((activity: UserActivity, match: RegExpMatchArray) => string)
  description?: string | ((activity: UserActivity, match: RegExpMatchArray) => string | null)
}

function methodsMatch(rule: PathRule, method: string) {
  if (!rule.method) return true
  const allowed = Array.isArray(rule.method) ? rule.method : [rule.method]
  return allowed.some((m) => m.toUpperCase() === method.toUpperCase())
}

function normalizePath(path: string) {
  const bare = path.split('?')[0] ?? path
  return bare.replace(/\/+$/, '') || '/'
}

function tryParseJson(value: string | null): unknown {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

function formatSearchDetails(details: string | null): string | null {
  const parsed = tryParseJson(details)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return details && !details.trim().startsWith('{') ? details : null
  }

  const data = parsed as Record<string, unknown>
  const parts: string[] = []

  const keyword = typeof data.Keyword === 'string' ? data.Keyword.trim() : ''
  if (keyword) parts.push(`Từ khóa: “${keyword}”`)

  const minPrice = typeof data.MinPrice === 'number' ? data.MinPrice : null
  const maxPrice = typeof data.MaxPrice === 'number' ? data.MaxPrice : null
  if (minPrice != null && maxPrice != null) {
    parts.push(`Giá ${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`)
  } else if (minPrice != null) {
    parts.push(`Giá từ ${formatPrice(minPrice)}`)
  } else if (maxPrice != null) {
    parts.push(`Giá đến ${formatPrice(maxPrice)}`)
  }

  const minArea = typeof data.MinArea === 'number' ? data.MinArea : null
  const maxArea = typeof data.MaxArea === 'number' ? data.MaxArea : null
  if (minArea != null && maxArea != null) {
    parts.push(`Diện tích ${minArea}–${maxArea} m²`)
  } else if (minArea != null) {
    parts.push(`Diện tích từ ${minArea} m²`)
  } else if (maxArea != null) {
    parts.push(`Diện tích đến ${maxArea} m²`)
  }

  const amenities = Array.isArray(data.Amenities)
    ? data.Amenities.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    : []
  if (amenities.length > 0) {
    parts.push(`Tiện nghi: ${amenities.join(', ')}`)
  }

  const minSlots = typeof data.MinAvailableSlots === 'number' ? data.MinAvailableSlots : null
  if (minSlots != null) parts.push(`Còn ít nhất ${minSlots} chỗ`)

  return parts.length > 0 ? parts.join(' · ') : 'Đã áp dụng bộ lọc tìm kiếm'
}

function readableDetails(details: string | null): string | null {
  if (!details) return null
  if (tryParseJson(details)) return null
  return details
}

const PATH_RULES: PathRule[] = [
  {
    method: 'POST',
    match: /^\/api\/rental-posts\/drafts$/i,
    title: 'Tạo bản nháp tin đăng',
  },
  {
    method: 'PUT',
    match: /^\/api\/rental-posts\/[^/]+$/i,
    title: 'Cập nhật tin đăng',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-posts\/[^/]+\/media$/i,
    title: 'Thêm ảnh / media tin đăng',
  },
  {
    method: 'DELETE',
    match: /^\/api\/rental-posts\/[^/]+\/media\/[^/]+$/i,
    title: 'Xóa media tin đăng',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-posts\/[^/]+\/submit$/i,
    title: 'Gửi duyệt tin đăng',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-posts\/[^/]+\/archive$/i,
    title: 'Lưu trữ tin đăng',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-posts\/[^/]+\/mark-rented$/i,
    title: 'Đánh dấu tin đã cho thuê',
  },
  {
    method: ['POST', 'PUT'],
    match: /^\/api\/rental-posts\/[^/]+\/reviews/i,
    title: 'Viết / cập nhật đánh giá',
  },
  {
    method: 'DELETE',
    match: /^\/api\/rental-posts\/[^/]+\/reviews/i,
    title: 'Xóa đánh giá',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-posts\/[^/]+\/viewing-appointments$/i,
    title: 'Đặt lịch xem phòng',
  },
  {
    method: 'PUT',
    match: /^\/api\/saved-posts\/[^/]+$/i,
    title: 'Lưu tin phòng',
  },
  {
    method: 'DELETE',
    match: /^\/api\/saved-posts\/[^/]+$/i,
    title: 'Bỏ lưu tin phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/roommate-invitations\/rental-posts\/[^/]+$/i,
    title: 'Gửi lời mời ở ghép',
  },
  {
    method: 'POST',
    match: /^\/api\/roommate-invitations\/[^/]+\/accept$/i,
    title: 'Chấp nhận lời mời ở ghép',
  },
  {
    method: 'POST',
    match: /^\/api\/roommate-invitations\/[^/]+\/reject$/i,
    title: 'Từ chối lời mời ở ghép',
  },
  {
    method: 'POST',
    match: /^\/api\/roommate-invitations\/[^/]+\/cancel$/i,
    title: 'Hủy lời mời ở ghép',
  },
  {
    method: 'POST',
    match: /^\/api\/conversations\/rental-posts\/[^/]+$/i,
    title: 'Bắt đầu trò chuyện về tin phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/conversations\/rental-wanted-posts\/[^/]+$/i,
    title: 'Nhắn tin về tin tìm phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/conversations\/[^/]+\/messages$/i,
    title: 'Gửi tin nhắn',
  },
  {
    method: 'POST',
    match: /^\/api\/viewing-appointments\/[^/]+\/confirm$/i,
    title: 'Xác nhận lịch xem phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/viewing-appointments\/[^/]+\/reject$/i,
    title: 'Từ chối lịch xem phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/viewing-appointments\/[^/]+\/cancel$/i,
    title: 'Hủy lịch xem phòng',
  },
  {
    method: ['POST', 'PUT', 'PATCH'],
    match: /^\/api\/viewing-appointments\/[^/]+\/reschedule$/i,
    title: 'Đổi lịch xem phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/viewing-appointments\/[^/]+\/complete$/i,
    title: 'Hoàn tất lịch xem phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/marketplace-posts$/i,
    title: 'Đăng tin chợ đồ',
  },
  {
    method: 'PUT',
    match: /^\/api\/marketplace-posts\/[^/]+$/i,
    title: 'Cập nhật tin chợ đồ',
  },
  {
    method: 'POST',
    match: /^\/api\/marketplace-posts\/[^/]+\/sold$/i,
    title: 'Đánh dấu đã bán (chợ đồ)',
  },
  {
    method: 'POST',
    match: /^\/api\/marketplace-posts\/[^/]+\/archive$/i,
    title: 'Lưu trữ tin chợ đồ',
  },
  {
    method: 'POST',
    match: /^\/api\/marketplace-posts\/[^/]+\/orders$/i,
    title: 'Đặt mua đồ trên chợ',
  },
  {
    method: 'POST',
    match: /^\/api\/marketplace-orders\/[^/]+\/accept$/i,
    title: 'Chấp nhận đơn chợ đồ',
  },
  {
    method: 'POST',
    match: /^\/api\/marketplace-orders\/[^/]+\/reject$/i,
    title: 'Từ chối đơn chợ đồ',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-wanted-posts$/i,
    title: 'Đăng tin tìm phòng',
  },
  {
    method: 'PUT',
    match: /^\/api\/rental-wanted-posts\/[^/]+$/i,
    title: 'Cập nhật tin tìm phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/rental-wanted-posts\/[^/]+\/close$/i,
    title: 'Đóng tin tìm phòng',
  },
  {
    method: 'PUT',
    match: /^\/api\/profile\/me(\/lifestyle)?$/i,
    title: 'Cập nhật hồ sơ',
  },
  {
    method: 'POST',
    match: /^\/api\/notifications\/read-all$/i,
    title: 'Đánh dấu đã đọc tất cả thông báo',
  },
  {
    method: 'POST',
    match: /^\/api\/notifications\/[^/]+\/read$/i,
    title: 'Đánh dấu đã đọc thông báo',
  },
  {
    method: 'POST',
    match: /^\/api\/reports$/i,
    title: 'Gửi báo cáo',
  },
  {
    method: 'POST',
    match: /^\/api\/chatbot\/messages$/i,
    title: 'Nhắn với trợ lý AI',
  },
  {
    method: 'POST',
    match: /^\/api\/ai\//i,
    title: 'Dùng trợ lý AI tìm phòng',
  },
  {
    method: 'POST',
    match: /^\/api\/subscriptions\//i,
    title: 'Thanh toán / kích hoạt gói Premium',
  },
  {
    method: 'POST',
    match: /^\/api\/payments\//i,
    title: 'Thực hiện thanh toán',
  },
  {
    method: 'POST',
    match: /^\/api\/upload\//i,
    title: 'Tải ảnh lên',
  },
  {
    method: 'POST',
    match: /^\/hubs\//i,
    title: 'Đồng bộ thông báo',
  },
  {
    method: 'POST',
    match: /^\/api\/account\//i,
    title: 'Thao tác tài khoản',
  },
]

function resolveFromPath(activity: UserActivity): ActivityDisplay | null {
  const path = normalizePath(activity.resourcePath)
  for (const rule of PATH_RULES) {
    if (!methodsMatch(rule, activity.httpMethod)) continue
    const match = path.match(rule.match)
    if (!match) continue
    const title = typeof rule.title === 'function' ? rule.title(activity, match) : rule.title
    const description =
      typeof rule.description === 'function'
        ? rule.description(activity, match)
        : (rule.description ?? readableDetails(activity.details))
    return { title, description }
  }
  return null
}

export function formatActivityDisplay(activity: UserActivity): ActivityDisplay {
  switch (activity.type) {
    case UserActivityType.ViewedRentalPost:
      return {
        title: 'Xem tin phòng',
        description: readableDetails(activity.details) ?? 'Đã mở chi tiết một tin đăng',
      }
    case UserActivityType.RentalSearch:
      return {
        title: 'Tìm kiếm phòng',
        description: formatSearchDetails(activity.details),
      }
    case UserActivityType.SentMessage:
      return {
        title: 'Gửi tin nhắn',
        description: readableDetails(activity.details),
      }
    case UserActivityType.RoommateInvitation:
      return {
        title: 'Thao tác lời mời ở ghép',
        description: readableDetails(activity.details),
      }
    case UserActivityType.Payment:
      return {
        title: 'Thanh toán',
        description: readableDetails(activity.details),
      }
    case UserActivityType.Review:
      return {
        title: 'Đánh giá tin phòng',
        description: readableDetails(activity.details),
      }
    case UserActivityType.Report:
      return {
        title: 'Gửi báo cáo',
        description: readableDetails(activity.details),
      }
    default:
      break
  }

  const fromPath = resolveFromPath(activity)
  if (fromPath) return fromPath

  // Avoid dumping raw API / JSON when nothing matched.
  const description = readableDetails(activity.details)
  return {
    title: 'Thao tác trên Homeji',
    description,
  }
}
