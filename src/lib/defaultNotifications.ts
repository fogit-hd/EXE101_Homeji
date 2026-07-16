import { getStoredSession } from '../api/client'
import { NotificationType, type Notification } from '../api/types'

const DEFAULT_NOTIFICATION_PREFIX = 'homeji-default:'
const STORAGE_VERSION = 'v1'
const memoryStates = new Map<string, StoredDefaultNotificationState>()

type StoredDefaultNotificationState = {
  seededAt: string
  readIds: string[]
}

type DefaultNotificationTemplate = {
  id: string
  type: Notification['type']
  title: string
  message: string
  relatedEntityId: string | null
  ageMs: number
}

const DEFAULT_NOTIFICATION_TEMPLATES: DefaultNotificationTemplate[] = [
  {
    id: `${DEFAULT_NOTIFICATION_PREFIX}welcome-v1`,
    type: NotificationType.SystemAnnouncement,
    title: 'Chào mừng bạn đến với Homeji 🎉',
    message:
      'Tìm phòng, kết nối bạn ở ghép và khám phá Chợ đồ ngay trên một bản đồ. Homeji rất vui được đồng hành cùng bạn.',
    relatedEntityId: null,
    ageMs: 0,
  },
  {
    id: `${DEFAULT_NOTIFICATION_PREFIX}new-member-offers-v1`,
    type: NotificationType.Promotion,
    title: 'Ưu đãi dành cho thành viên mới',
    message:
      'Bạn có thể tạo tài khoản và khám phá tin đăng hoàn toàn miễn phí. Theo dõi Homeji để không bỏ lỡ các ưu đãi Premium sắp tới.',
    relatedEntityId: null,
    ageMs: 2 * 60 * 1000,
  },
  {
    id: `${DEFAULT_NOTIFICATION_PREFIX}marketplace-v1`,
    type: NotificationType.MarketplaceTip,
    title: 'Chợ đồ Homeji đã sẵn sàng',
    message:
      'Khám phá món ăn và đồ dùng gần bạn, thêm sản phẩm vào giỏ rồi theo dõi đơn hàng ngay trong Chợ đồ.',
    relatedEntityId: null,
    ageMs: 8 * 60 * 1000,
  },
  {
    id: `${DEFAULT_NOTIFICATION_PREFIX}safety-v1`,
    type: NotificationType.SafetyTip,
    title: 'Mẹo thuê phòng an toàn',
    message:
      'Hãy xem phòng trực tiếp, kiểm tra hợp đồng và xác minh người đăng trước khi đặt cọc hoặc chuyển tiền.',
    relatedEntityId: null,
    ageMs: 24 * 60 * 60 * 1000,
  },
]

function storageKey(): string {
  const session = getStoredSession()
  const identity = session?.userId || session?.email || 'guest'
  return `homeji.default-notifications.${STORAGE_VERSION}.${identity}`
}

function initialState(): StoredDefaultNotificationState {
  return { seededAt: new Date().toISOString(), readIds: [] }
}

function readState(): StoredDefaultNotificationState {
  if (typeof window === 'undefined') return initialState()

  const key = storageKey()

  try {
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredDefaultNotificationState>
      if (typeof parsed.seededAt === 'string' && Array.isArray(parsed.readIds)) {
        const state = {
          seededAt: parsed.seededAt,
          readIds: parsed.readIds.filter((id): id is string => typeof id === 'string'),
        }
        memoryStates.set(key, state)
        return state
      }
    }
  } catch {
    // Storage can be unavailable in strict privacy modes. Defaults remain usable in-memory.
  }

  const memoryState = memoryStates.get(key)
  if (memoryState) return { ...memoryState, readIds: [...memoryState.readIds] }

  const state = initialState()
  writeState(state)
  return state
}

function writeState(state: StoredDefaultNotificationState): void {
  if (typeof window === 'undefined') return
  memoryStates.set(storageKey(), { ...state, readIds: [...state.readIds] })
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(state))
  } catch {
    // Reading notifications must not fail because persistent storage is unavailable.
  }
}

export function isDefaultNotificationId(id: string): boolean {
  return id.startsWith(DEFAULT_NOTIFICATION_PREFIX)
}

export function getDefaultNotifications(unreadOnly = false): Notification[] {
  const state = readState()
  const seededAt = Date.parse(state.seededAt)
  const baseTime = Number.isFinite(seededAt) ? seededAt : Date.now()
  const readIds = new Set(state.readIds)

  return DEFAULT_NOTIFICATION_TEMPLATES.map((template) => {
    const isRead = readIds.has(template.id)
    return {
      id: template.id,
      type: template.type,
      title: template.title,
      message: template.message,
      relatedEntityId: template.relatedEntityId,
      isRead,
      createdAt: new Date(baseTime - template.ageMs).toISOString(),
      readAt: isRead ? state.seededAt : null,
    }
  }).filter((notification) => !unreadOnly || !notification.isRead)
}

export function markDefaultNotificationRead(id: string): Notification {
  const state = readState()
  if (!state.readIds.includes(id)) {
    state.readIds = [...state.readIds, id]
    writeState(state)
  }

  const notification = getDefaultNotifications(false).find((item) => item.id === id)
  if (!notification) throw new Error('Không tìm thấy thông báo mặc định.')
  return notification
}

export function markAllDefaultNotificationsRead(): void {
  const state = readState()
  state.readIds = DEFAULT_NOTIFICATION_TEMPLATES.map((item) => item.id)
  writeState(state)
}
