import { relativeTime } from '../lib/notificationTime'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NotificationType, type Notification } from '../api'
import { getNotificationPresentation } from '../lib/notificationPresentation'
import { notificationTargetHref } from '../lib/notificationTarget'

type IconName = 'home' | 'calendar' | 'users' | 'bag' | 'shield' | 'wrench' | 'spark' | 'chat' | 'flag' | 'heart' | 'bell'

const ICON_PATHS: Record<IconName, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3 2.4 3.5 5.2',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  chat: 'M4 5h16v11H9l-5 4z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
}

function iconFor(type: Notification['type']): IconName {
  switch (type) {
    case NotificationType.PostApproved:
    case NotificationType.PostRejected:
    case NotificationType.NewMatchingRentalPost:
      return type === NotificationType.NewMatchingRentalPost ? 'spark' : 'home'
    case NotificationType.RoommateInvitationReceived:
    case NotificationType.RoommateInvitationAccepted:
      return 'users'
    case NotificationType.ReportResolved:
      return 'flag'
    case NotificationType.NewMessage:
    case NotificationType.DirectMessage:
      return 'chat'
    case NotificationType.ViewingAppointmentRequested:
    case NotificationType.ViewingAppointmentUpdated:
      return 'calendar'
    case NotificationType.LandlordVerificationUpdated:
    case NotificationType.SafetyTip:
      return 'shield'
    case NotificationType.SavedPostChanged:
      return 'heart'
    case NotificationType.MarketplaceOrderUpdated:
    case NotificationType.MarketplaceTip:
      return 'bag'
    case NotificationType.MaintenanceAnnouncement:
      return 'wrench'
    case NotificationType.Promotion:
      return 'spark'
    default:
      return 'bell'
  }
}

function Glyph({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}



export function NotificationPopupList({
  items,
  unreadOnly,
  readBusy,
  onOpen,
  onMarkRead,
}: {
  items: Notification[]
  unreadOnly: boolean
  readBusy: string | null
  onOpen?: (notification: Notification) => void
  onMarkRead: (id: string) => void
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  if (items.length === 0) {
    return (
      <motion.div className="hj-notify__empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <span className="hj-notify__empty-icon"><Glyph name="bell" size={28} /></span>
        <strong>{unreadOnly ? 'Bạn đã xem hết thông báo' : 'Chưa có thông báo'}</strong>
        <p>Thông báo mới về tin đăng, lịch xem phòng và đơn hàng sẽ xuất hiện ở đây.</p>
      </motion.div>
    )
  }
  return (
    <ul className="hj-nrow-list" data-glass-exclude>
      <AnimatePresence initial={false}>
        {items.map((n, index) => {
          const { importance } = getNotificationPresentation(n)
          const target = onOpen && notificationTargetHref(n) ? n : null
          const activate = () => {
            if (!n.isRead) onMarkRead(n.id)
            if (target) onOpen?.(n)
          }
          return (
            <motion.li
              key={n.id}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.025 } }}
              exit={{ opacity: 0, height: 0 }}
              className={`hj-nrow hj-nrow--${importance}${n.isRead ? '' : ' is-unread'}`}
            >
              <button type="button" className="hj-nrow__main" onClick={activate}
                aria-label={`${n.title}${n.isRead ? '' : ', chưa đọc'}`}>
                <span className="hj-nrow__icon"><Glyph name={iconFor(n.type)} /><i className="hj-nrow__sev" /></span>
                <span className="hj-nrow__body">
                  <span className="hj-nrow__top">
                    <span className="hj-nrow__title">{n.title}</span>
                    <time className="hj-nrow__time" dateTime={n.createdAt}>{relativeTime(n.createdAt, now)}</time>
                  </span>
                  <span className="hj-nrow__msg">{n.message}</span>
                </span>
                {!n.isRead ? <span className="hj-nrow__dot" aria-hidden="true" /> : null}
              </button>
              {!n.isRead ? (
                <button type="button" className="hj-nrow__read" title="Đánh dấu đã đọc"
                  aria-label="Đánh dấu đã đọc" disabled={readBusy !== null}
                  onClick={() => onMarkRead(n.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </button>
              ) : null}
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
