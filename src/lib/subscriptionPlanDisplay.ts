import type { SubscriptionPackage } from '../api'
import { SubscriptionTier } from '../api/types'
import { formatPrice } from './labels'

/** Giá tham chiếu 1 tháng để tính % tiết kiệm. */
export const PREMIUM_MONTHLY_REF_PRICE = 99_000

export type PlanHighlight = 'popular' | 'best-value' | null

export type PlanDisplay = {
  title: string
  tierTag: string
  tierTagTone: 'standard' | 'premium'
  highlight: PlanHighlight
  highlightLabel: string | null
  /** Giá nổi bật (thường là giá / tháng). */
  headlinePrice: string
  headlineSuffix: string
  /** Dòng phụ: tổng thanh toán / thời hạn. */
  totalLine: string | null
  savingsLabel: string | null
  benefits: string[]
  note: string | null
}

const PREMIUM_BENEFITS = [
  'Có badge Cao cấp trên bài đăng',
  'Bài đăng được ưu tiên hiển thị theo điểm boost',
  'Tăng khả năng xuất hiện trong đề xuất AI',
]

function monthsFromDuration(days: number): number {
  if (days >= 330) return 12
  if (days >= 150) return 6
  if (days >= 25) return 1
  return 0
}

function resolvePremiumMeta(plan: SubscriptionPackage): {
  title: string
  highlight: PlanHighlight
  highlightLabel: string | null
} {
  const code = plan.code.toUpperCase()
  const months = monthsFromDuration(plan.durationDays)

  if (code.includes('YEAR') || months === 12) {
    return { title: 'Gói Tối Ưu', highlight: 'best-value', highlightLabel: 'Tiết Kiệm Nhất' }
  }
  if (code.includes('6MONTH') || code.includes('SEMI') || months === 6) {
    return { title: 'Gói An Tâm', highlight: 'popular', highlightLabel: 'Phổ Biến Nhất' }
  }
  if (code.includes('QUARTER') && plan.durationDays <= 100) {
    return { title: 'Gói An Tâm', highlight: 'popular', highlightLabel: 'Phổ Biến Nhất' }
  }
  return { title: 'Gói Trải Nghiệm', highlight: null, highlightLabel: null }
}

export function getPlanDisplay(plan: SubscriptionPackage): PlanDisplay {
  if (plan.tier === SubscriptionTier.Basic || plan.price <= 0) {
    return {
      title: 'Standard',
      tierTag: 'Standard',
      tierTagTone: 'standard',
      highlight: null,
      highlightLabel: null,
      headlinePrice: 'Miễn phí',
      headlineSuffix: '',
      totalLine: null,
      savingsLabel: null,
      benefits: plan.benefits?.length ? plan.benefits : [
        'Sử dụng đầy đủ chức năng web và app',
        'Tìm kiếm và xem bài đăng',
        'Lưu bài, báo cáo, gửi lời mời roommate',
      ],
      note: 'Mặc định cho mọi tài khoản',
    }
  }

  const meta = resolvePremiumMeta(plan)
  const months = monthsFromDuration(plan.durationDays) || 1
  const perMonth = Math.round(Number(plan.price) / months)
  const refTotal = PREMIUM_MONTHLY_REF_PRICE * months
  const savePct =
    refTotal > 0 && plan.price < refTotal
      ? Math.round((1 - Number(plan.price) / refTotal) * 100)
      : 0

  const benefits =
    plan.benefits?.length > 0
      ? plan.benefits.map((b) =>
          b.includes('badge Premium') ? 'Có badge Cao cấp trên bài đăng' : b,
        )
      : PREMIUM_BENEFITS

  if (months <= 1) {
    return {
      title: meta.title,
      tierTag: 'Premium',
      tierTagTone: 'premium',
      highlight: meta.highlight,
      highlightLabel: meta.highlightLabel,
      headlinePrice: formatPrice(plan.price),
      headlineSuffix: '/ tháng',
      totalLine: null,
      savingsLabel: null,
      benefits,
      note: null,
    }
  }

  return {
    title: meta.title,
    tierTag: 'Premium',
    tierTagTone: 'premium',
    highlight: meta.highlight,
    highlightLabel: meta.highlightLabel,
    headlinePrice: formatPrice(perMonth),
    headlineSuffix: '/ tháng',
    totalLine: `Thanh toán ${formatPrice(plan.price)} / ${plan.durationDays} ngày`,
    savingsLabel: savePct > 0 ? `Tiết kiệm ${savePct}%` : null,
    benefits,
    note: null,
  }
}

/** Sắp xếp: Standard → 1 tháng → 6 tháng → 1 năm */
export function sortPlansForDisplay(plans: SubscriptionPackage[]): SubscriptionPackage[] {
  const rank = (p: SubscriptionPackage) => {
    if (p.tier === SubscriptionTier.Basic || p.price <= 0) return 0
    const m = monthsFromDuration(p.durationDays)
    if (m <= 1) return 1
    if (m === 6) return 2
    return 3
  }
  return [...plans].sort((a, b) => rank(a) - rank(b) || a.price - b.price)
}
