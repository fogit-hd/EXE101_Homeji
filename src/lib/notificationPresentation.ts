import { NotificationType, type Notification } from '../api/types.ts'

export type NotificationImportance = 'critical' | 'attention' | 'success' | 'info'

export type NotificationPresentation = {
  importance: NotificationImportance
  importanceLabel: string
  icon: string
}

const CRITICAL_TEXT = ['bị từ chối', 'từ chối', 'thất bại', 'đã hủy', 'bị hủy', 'vi phạm']
const SUCCESS_TEXT = ['được duyệt', 'chấp nhận', 'hoàn tất', 'thành công', 'đã xử lý', 'đã giao']

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function getNotificationPresentation(
  notification: Pick<Notification, 'type' | 'title' | 'message'>,
): NotificationPresentation {
  const content = `${notification.title} ${notification.message}`.toLocaleLowerCase('vi')

  if (includesAny(content, CRITICAL_TEXT) || notification.type === NotificationType.PostRejected) {
    return { importance: 'critical', importanceLabel: 'Khẩn cấp', icon: '!' }
  }

  if (
    includesAny(content, SUCCESS_TEXT) ||
    notification.type === NotificationType.PostApproved ||
    notification.type === NotificationType.RoommateInvitationAccepted ||
    notification.type === NotificationType.ReportResolved
  ) {
    return { importance: 'success', importanceLabel: 'Thành công', icon: '✓' }
  }

  if (
    notification.type === NotificationType.RoommateInvitationReceived ||
    notification.type === NotificationType.ViewingAppointmentRequested ||
    notification.type === NotificationType.ViewingAppointmentUpdated ||
    notification.type === NotificationType.LandlordVerificationUpdated ||
    notification.type === NotificationType.SavedPostChanged ||
    notification.type === NotificationType.MarketplaceOrderUpdated ||
    notification.type === NotificationType.SafetyTip
  ) {
    return { importance: 'attention', importanceLabel: 'Cần chú ý', icon: '⚠' }
  }

  return { importance: 'info', importanceLabel: 'Thông tin', icon: 'i' }
}
