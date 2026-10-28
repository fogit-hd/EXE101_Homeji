import type { SubscriptionPackage } from '../api'
import { SubscriptionTier } from '../api/types'
import { formatPrice } from './labels'

const LEGACY_BENEFITS: Record<string, string> = {
  'Sử dụng đầy đủ chức năng web và app': 'Tìm phòng và liên hệ người đăng trên Homeji',
  'Lưu bài, báo cáo, gửi lời mời roommate': 'Lưu tin, báo cáo vi phạm và gửi lời mời ở ghép',
  'Có badge Premium trên bài đăng': 'Hiển thị nhãn Premium trên tin đăng',
  'Có badge Cao cấp trên bài đăng': 'Hiển thị nhãn Premium trên tin đăng',
  'Bài đăng được ưu tiên hiển thị theo điểm boost': 'Tin đăng được ưu tiên hiển thị',
  'Tăng khả năng xuất hiện trong đề xuất AI': 'Khung viền nổi bật cho tin phòng',
}

/** Show the payable total and exact catalog duration; never infer popularity or savings. */
export function getPlanDisplay(plan: SubscriptionPackage) {
  const basic = plan.tier === SubscriptionTier.Basic
  return {
    title: basic ? 'Miễn phí' : plan.name,
    headlinePrice: plan.price > 0 ? formatPrice(plan.price) : 'Miễn phí',
    headlineSuffix: !basic && plan.durationDays > 0 ? `/ ${plan.durationDays} ngày` : '',
    totalLine: basic ? 'Dành cho mọi tài khoản' : 'Thanh toán một lần cho thời hạn đã chọn.',
    benefits: (plan.benefits ?? []).map(benefit => LEGACY_BENEFITS[benefit] ?? benefit),
  }
}

export function sortPlansForDisplay(plans: SubscriptionPackage[]): SubscriptionPackage[] {
  return [...plans].sort((a, b) =>
    Number(a.tier !== SubscriptionTier.Basic) - Number(b.tier !== SubscriptionTier.Basic)
    || a.durationDays - b.durationDays || a.price - b.price)
}
