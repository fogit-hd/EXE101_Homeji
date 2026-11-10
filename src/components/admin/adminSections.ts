export type AdminQueue = 'posts' | 'reports' | 'verifications' | 'withdrawals'

export type AdminSection =
  | 'home' | 'analytics'
  | AdminQueue | 'aiReviews'
  | 'registrations' | 'pricing' | 'exports'
  | 'active' | 'maintenance'

export type AdminSectionInfo = {
  id: AdminSection
  /** URL segment after `/admin/`; the home section owns `/admin` itself. */
  slug: string
  label: string
  group: string
  title: string
  description: string
}

export const adminSections: AdminSectionInfo[] = [
  { id: 'home', slug: '', label: 'Trang chủ', group: 'Điều hành', title: 'Trang chủ điều hành', description: 'Việc cần xử lý hôm nay, tình trạng hệ thống và chỉ số chính.' },
  { id: 'analytics', slug: 'analytics', label: 'Phân tích sản phẩm', group: 'Điều hành', title: 'Tổng quan sản phẩm', description: 'Hoạt động, thị trường theo khu vực và lượt ghé website.' },
  { id: 'posts', slug: 'posts', label: 'Tin chờ duyệt', group: 'Hàng chờ', title: 'Tin chờ duyệt', description: 'Kiểm tra thông tin và sự đồng ý của chủ nhà trước khi duyệt.' },
  { id: 'aiReviews', slug: 'ai-reviews', label: 'AI kiểm tra tin', group: 'Hàng chờ', title: 'AI kiểm tra tin', description: 'Kiểm tra lần lượt, giới hạn lượt gọi và xem lại kết quả.' },
  { id: 'reports', slug: 'reports', label: 'Báo cáo vi phạm', group: 'Hàng chờ', title: 'Báo cáo vi phạm', description: 'Đọc nội dung bị báo cáo, ghi lại kết quả kiểm tra rồi đưa ra kết luận.' },
  { id: 'verifications', slug: 'verifications', label: 'Xác minh chủ nhà', group: 'Hàng chờ', title: 'Xác minh chủ nhà', description: 'Đối chiếu giấy tờ và lưu ghi chú cho từng hồ sơ.' },
  { id: 'withdrawals', slug: 'withdrawals', label: 'Rút tiền', group: 'Hàng chờ', title: 'Yêu cầu rút tiền', description: 'Đối chiếu người nhận và mã chuyển khoản trước khi xác nhận.' },
  { id: 'registrations', slug: 'registrations', label: 'Tài khoản & thành viên', group: 'Kinh doanh', title: 'Tài khoản & thành viên', description: 'Xem người đã đăng ký tài khoản, lịch sử mua gói và thời hạn thành viên.' },
  { id: 'pricing', slug: 'pricing', label: 'Giá gói Premium', group: 'Kinh doanh', title: 'Giá gói Premium', description: 'Sửa giá, nêu lý do và công bố cho người xem.' },
  { id: 'exports', slug: 'exports', label: 'Báo cáo Excel', group: 'Kinh doanh', title: 'Báo cáo Excel', description: 'Tạo báo cáo, theo dõi email và tải lại các file đã xuất.' },
  { id: 'active', slug: 'active', label: 'Đang hoạt động', group: 'Hệ thống', title: 'Người đang hoạt động', description: 'Theo dõi kết nối và quản lý phiên đăng nhập.' },
  { id: 'maintenance', slug: 'maintenance', label: 'Bảo trì', group: 'Hệ thống', title: 'Bảo trì', description: 'Soạn nội dung và thời gian dự kiến để thông báo cho người dùng.' },
]

const bySlug = new Map(adminSections.map(section => [section.slug, section]))
const byId = new Map(adminSections.map(section => [section.id, section]))

export const adminSectionInfo = (id: AdminSection) => byId.get(id)!
export const adminSectionPath = (id: AdminSection) => {
  const { slug } = adminSectionInfo(id)
  return slug ? `/admin/${slug}` : '/admin'
}
/** Returns null for an unknown segment so the route can fall back to the home section. */
export const adminSectionFromSlug = (slug: string | undefined) => bySlug.get(slug ?? '')?.id ?? null
export const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/')

export const adminQueueLabels: Record<AdminQueue, string> = {
  posts: 'Tin chờ duyệt', reports: 'Báo cáo', verifications: 'Xác minh chủ nhà', withdrawals: 'Yêu cầu rút tiền',
}

/** Plain-language waiting time; an unreadable date yields null so the UI omits it instead of guessing. */
export function waitingLabel(since: string | null | undefined, now = Date.now()): string | null {
  const started = since ? new Date(since).getTime() : NaN
  if (!Number.isFinite(started)) return null
  const minutes = Math.max(0, Math.floor((now - started) / 60_000))
  if (minutes < 60) return minutes < 1 ? 'vừa xong' : `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ`
  return `${Math.floor(hours / 24)} ngày`
}
