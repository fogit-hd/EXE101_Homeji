import { isNavigationItemActive, navigationItems } from '../components/shell/navigation'

const SECTION_TITLES: Record<string, string> = {
  marketplace: 'Chợ Homeji',
  invitations: 'Ở ghép',
  messages: 'Tin nhắn',
  saved: 'Đã lưu',
  appointments: 'Lịch xem phòng',
  myPosts: 'Tin của tôi',
  profile: 'Hồ sơ',
  payments: 'Gói Premium',
  help: 'Trợ giúp',
  wanted: 'Tin tìm phòng',
  activities: 'Nhật ký',
  notifications: 'Thông báo',
  listings: 'Tìm phòng',
  explore: 'Tìm phòng',
}

/** The title the phone header shows, so every screen answers "where am I?". */
export function mobilePageTitle(pathname: string, search: string): string {
  if (pathname === '/posts/new') return 'Đăng tin'
  if (/^\/posts\/[^/]+\/edit$/.test(pathname)) return 'Sửa tin'
  if (pathname === '/referrals') return 'Mời bạn'
  if (pathname === '/receipts') return 'Hóa đơn'
  if (pathname === '/payments/wait') return 'Thanh toán'
  if (pathname === '/privacy') return 'Quyền riêng tư'
  if (pathname === '/terms') return 'Điều khoản'
  if (pathname !== '/') return 'Homeji'
  const params = new URLSearchParams(search)
  const section = params.get('section')
  if (!section && !params.get('post')) return 'Homeji'
  if (section === 'marketplace') return SECTION_TITLES.marketplace
  const item = navigationItems.find((entry) => entry.id !== 'home' && isNavigationItemActive(entry, pathname, search))
  if (item) return item.label
  return (section && SECTION_TITLES[section]) || 'Homeji'
}
