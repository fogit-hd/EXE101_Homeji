import { NotificationType, type Notification } from '../api'
import { mapPostUrl, mapSectionUrl } from './mapDeepLinks'

/** Where “Mở” goes. Matches the notifications page: no target means no button. */
export function notificationTargetHref(n: Notification): string | null {
  switch (n.type) {
    case NotificationType.NewMessage:
    case NotificationType.DirectMessage:
      return mapSectionUrl('messages')
    case NotificationType.ViewingAppointmentRequested:
    case NotificationType.ViewingAppointmentUpdated:
      return mapSectionUrl('appointments')
    case NotificationType.RoommateInvitationReceived:
    case NotificationType.RoommateInvitationAccepted:
      return mapSectionUrl('invitations')
    case NotificationType.MarketplaceOrderUpdated:
      return mapSectionUrl('marketplace')
    case NotificationType.LandlordVerificationUpdated:
      return mapSectionUrl('profile')
    case NotificationType.PostApproved:
    case NotificationType.PostRejected:
    case NotificationType.NewMatchingRentalPost:
    case NotificationType.SavedPostChanged:
      if (n.relatedEntityId) return mapPostUrl(n.relatedEntityId)
      return mapSectionUrl('listings')
    case NotificationType.MarketplaceTip:
    case NotificationType.SafetyTip:
      return mapSectionUrl('listings')
    default:
      return null
  }
}
