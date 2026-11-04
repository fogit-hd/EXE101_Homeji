import { ConversationSubjectType, MessageAttachmentContext } from '../../../api'
import { parseChatGif } from '../../../lib/chatGif'
import { parseChatLocation } from '../../../lib/chatLocation'

export type InboxFilter = 'all' | 'unread' | 'rental'
export type AttachMode = 'menu' | 'address' | null
export type ChatShareTarget = {
  name: string
  address?: string
  lat?: number
  lng?: number
}

export const attachmentContextLabel: Record<number, string> = {
  [MessageAttachmentContext.Other]: 'Ảnh khác',
  [MessageAttachmentContext.CurrentRoom]: 'Phòng hiện tại',
  [MessageAttachmentContext.Bathroom]: 'WC / phòng tắm',
  [MessageAttachmentContext.Kitchen]: 'Bếp',
  [MessageAttachmentContext.Entrance]: 'Lối vào',
  [MessageAttachmentContext.UtilityMeter]: 'Đồng hồ điện nước',
  [MessageAttachmentContext.ExistingDamage]: 'Hư hỏng hiện hữu',
}
export function messageSearchText(body: string): string {
  const gif = parseChatGif(body)
  if (gif) return 'GIF'
  const loc = parseChatLocation(body)
  if (!loc) return body
  return [loc.title, loc.address, loc.kind].filter(Boolean).join(' ')
}

export function conversationPreview(
  body: string | null | undefined,
  senderId: string | null | undefined,
  myId: string | null | undefined,
): { text: string; muted: boolean } {
  if (!body?.trim()) return { text: 'Bắt đầu trò chuyện', muted: true }
  const loc = parseChatLocation(body)
  const text = loc ? '📍 Đã gửi một vị trí' : parseChatGif(body) ? 'Đã gửi một GIF' : body.trim()
  if (myId && senderId && senderId === myId) return { text: `Bạn: ${text}`, muted: false }
  return { text, muted: false }
}

const AVATAR_COLORS = ['#2f855a', '#c05621', '#6b46c1', '#2b6cb0', '#b83280', '#0f766e', '#a16207', '#4c51bf']

export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return (name.slice(0, 2) || '?').toUpperCase()
}
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const DAY_MS = 86_400_000

/** Inbox stamp: "Vừa xong", "5 phút", "3 giờ", "Hôm qua", "3 thg 10" (year only when not this year). */
export function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'Vừa xong'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS)
  if (days === 0) return `${Math.floor(diff / 3_600_000)} giờ`
  if (days === 1) return 'Hôm qua'
  return d.getFullYear() === now.getFullYear()
    ? `${d.getDate()} thg ${d.getMonth() + 1}`
    : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS)
  if (days === 0) return 'Hôm nay'
  if (days === 1) return 'Hôm qua'
  return d.getFullYear() === now.getFullYear()
    ? `${d.getDate()} thg ${d.getMonth() + 1}`
    : `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

export const subjectTag: Record<number, { label: string; tone: string }> = {
  [ConversationSubjectType.RentalPost]: { label: '⌂ Phòng thuê', tone: 'room' },
  [ConversationSubjectType.MarketplacePost]: { label: '▣ Chợ đồ', tone: 'market' },
  [ConversationSubjectType.WantedPost]: { label: 'Tin cần tìm', tone: 'wanted' },
  [ConversationSubjectType.RoommateInvitation]: { label: 'Bạn cùng phòng', tone: 'wanted' },
}

export type ContextItem = {
  key: string
  kind: string
  title: string
  detail?: string
  thumb?: string | null
  href?: string
  at: number
  onOpen?: () => void
}

export type SubjectInfo = { conversationId: string; title: string; price?: number; thumb: string | null; href: string }

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
