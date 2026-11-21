import { UserRole } from '../../api/types'
import { mapSectionUrl } from '../../lib/mapDeepLinks'

export type PromoBannerVariant = 'hero' | 'rail'

export type PromoSlide = {
  artIndex: number
  eyebrow: string
  title: string
  keyword: string
  sub: string
  cta: string
  to?: string
  accent: string
  bg: [string, string]
  dot: string
  roles: readonly UserRole[]
}

const SLIDES: PromoSlide[] = [
  { artIndex: 0, eyebrow: 'Mời bạn cùng dùng', title: 'Cả hai nhận voucher', keyword: 'tối đa 50k/người', sub: 'Bạn mới xác nhận email và nhận lời mời. Đợt này có 10 lượt nhận quà; xem điều kiện áp dụng.', cta: 'Mời bạn & nhận quà', to: '/referrals', accent: '#a43c22', bg: ['#fff8ee', '#ffe9d6'], dot: '#f3d9c2', roles: [UserRole.Renter, UserRole.Landlord] },
  { artIndex: 1, eyebrow: 'Tính năng mới', title: 'Tìm bạn ở ghép', keyword: 'hợp gu', sub: 'Ghép theo giờ giấc, ngân sách và thói quen sinh hoạt của bạn.', cta: 'Thử ngay', to: mapSectionUrl('invitations'), accent: '#00b14f', bg: ['#f1faf4', '#d9f3e3'], dot: '#cfe9d8', roles: [UserRole.Renter] },
  { artIndex: 2, eyebrow: 'Quanh nơi bạn ở', title: 'Đồ cũ và đồ ăn', keyword: 'quanh trọ', sub: 'Tìm đồ dùng và món ăn theo người bán. Xem địa chỉ nhận trước khi đặt.', cta: 'Xem chợ', to: mapSectionUrl('marketplace'), accent: '#0f7c80', bg: ['#eef8f8', '#d5eeee'], dot: '#c8e3e3', roles: [UserRole.Renter, UserRole.Landlord, UserRole.Admin] },
  { artIndex: 3, eyebrow: 'Xem phòng', title: 'Đặt lịch xem phòng', keyword: 'theo giờ bạn rảnh', sub: 'Chọn giờ rảnh, chờ chủ trọ xác nhận trong ứng dụng.', cta: 'Đặt lịch ngay', to: mapSectionUrl('listings'), accent: '#b7791f', bg: ['#fffaf0', '#ffeec7'], dot: '#f0dfb6', roles: [UserRole.Renter] },
  { artIndex: 4, eyebrow: 'Trợ lý Homeji AI', title: 'AI gợi ý phòng', keyword: 'hợp gu', sub: 'Nói nhu cầu của bạn, AI chọn ra những phòng phù hợp nhất.', cta: 'Hỏi AI ngay', accent: '#00a047', bg: ['#effaf6', '#d4f1e6'], dot: '#c9e8dc', roles: [UserRole.Renter, UserRole.Admin] },
  { artIndex: 5, eyebrow: 'Gói Premium', title: 'Chọn gói Premium', keyword: 'phù hợp nhu cầu', sub: 'Xem giá, thời hạn và quyền lợi của từng gói trước khi thanh toán.', cta: 'Xem các gói', to: mapSectionUrl('payments'), accent: '#24543e', bg: ['#f1f6f8', '#d9eaf0'], dot: '#cfe0e6', roles: [UserRole.Renter, UserRole.Landlord] },
  { artIndex: 6, eyebrow: 'Quản lý tin cho thuê', title: 'Đăng và quản lý', keyword: 'tin của bạn', sub: 'Thêm ảnh, giá và địa chỉ rõ ràng để người thuê dễ tìm hiểu.', cta: 'Quản lý tin', to: mapSectionUrl('myPosts'), accent: '#a43c22', bg: ['#fdf3ef', '#f9dccf'], dot: '#f0d5c8', roles: [UserRole.Landlord] },
  { artIndex: 7, eyebrow: 'Voucher của bạn', title: 'Ưu đãi đồ ăn', keyword: 'và gói Premium', sub: 'Xem voucher còn hạn, mức giảm và điều kiện dùng trong tài khoản của bạn.', cta: 'Xem voucher', to: '/referrals', accent: '#3f7d1f', bg: ['#f5faec', '#e1f0c9'], dot: '#d9e8c2', roles: [UserRole.Renter, UserRole.Landlord] },
  { artIndex: 5, eyebrow: 'Bảng điều hành', title: 'Quản trị & duyệt tin', keyword: 'Homeji', sub: 'Kiểm tra tin chờ duyệt, báo cáo vi phạm, xác minh chủ nhà và chỉ số vận hành.', cta: 'Mở quản trị', to: '/admin', accent: '#24543e', bg: ['#f1f6f8', '#d9eaf0'], dot: '#cfe0e6', roles: [UserRole.Admin] },
]

const DEFAULT_SLIDES = SLIDES.slice(0, 8)

export function getPromoSlidesForRole(role?: UserRole | null): readonly PromoSlide[] {
  if (role == null) return DEFAULT_SLIDES
  const filtered = SLIDES.filter((slide) => slide.roles.includes(role))
  if (filtered.length === 0) return DEFAULT_SLIDES
  if (role === UserRole.Landlord) {
    return [...filtered].sort((a, b) => (a.artIndex === 6 ? -1 : b.artIndex === 6 ? 1 : a.artIndex === 5 ? -1 : b.artIndex === 5 ? 1 : 0))
  }
  if (role === UserRole.Admin) {
    return [...filtered].sort((a, b) => (a.to === '/admin' ? -1 : b.to === '/admin' ? 1 : 0))
  }
  return filtered
}
