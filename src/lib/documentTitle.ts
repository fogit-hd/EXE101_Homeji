const SITE = 'Homeji'
const HOME_TITLE = 'Homeji — Tìm phòng trọ quanh Thủ Đức và Quận 9'

const PATH_TITLES: Record<string, string> = {
  '/login': 'Đăng nhập',
  '/register': 'Đăng ký',
  '/verify-email': 'Xác nhận email',
  '/forgot-password': 'Quên mật khẩu',
  '/reset-password': 'Đặt lại mật khẩu',
  '/referrals': 'Mời bạn và voucher',
  '/receipts': 'Biên nhận',
  '/privacy': 'Chính sách quyền riêng tư',
  '/terms': 'Điều khoản sử dụng',
  '/posts/new': 'Đăng tin mới',
  '/payments/wait': 'Thanh toán',
  '/admin': 'Quản trị',
}

const SECTION_TITLES: Record<string, string> = {
  listings: 'Tìm phòng',
  explore: 'Tìm phòng',
  saved: 'Phòng đã lưu',
  invitations: 'Ở ghép',
  notifications: 'Thông báo',
  messages: 'Tin nhắn',
  appointments: 'Lịch xem phòng',
  payments: 'Gói Premium',
  profile: 'Hồ sơ',
  marketplace: 'Chợ Homeji',
  wanted: 'Tin tìm phòng',
  activities: 'Nhật ký hoạt động',
  myPosts: 'Tin của tôi',
}

/** Each destination gets its own tab title and screen reader announcement. */
export function documentTitleFor(pathname: string, search: string): string {
  const name = pathname === '/'
    ? SECTION_TITLES[new URLSearchParams(search).get('section') ?? '']
    : /^\/posts\/[^/]+\/edit$/.test(pathname) ? 'Sửa tin đăng' : PATH_TITLES[pathname]
  return name ? `${name} · ${SITE}` : HOME_TITLE
}
