import type { AdminAreaInsight, AdminPriceEvidence } from '../../api/types'

type PriceSnapshot = AdminPriceEvidence & {
  activeListings: number
  medianMonthlyPrice: number
  averagePricePerSquareMeter: number
}

export function adminPriceEvidence(data: PriceSnapshot) {
  const { priceSampleCount, priceAreaSampleCount, excludedPriceCount } = data
  const valid = data.priceBasis === 'room_month'
    && [data.activeListings, priceSampleCount, priceAreaSampleCount, excludedPriceCount]
      .every(value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    && priceSampleCount! + excludedPriceCount! === data.activeListings
    && priceAreaSampleCount! <= priceSampleCount!
  return {
    monthlyPrice: valid && priceSampleCount! > 0 && Number.isFinite(data.medianMonthlyPrice) && data.medianMonthlyPrice > 0
      ? data.medianMonthlyPrice : null,
    pricePerSquareMeter: valid && priceAreaSampleCount! > 0 && Number.isFinite(data.averagePricePerSquareMeter) && data.averagePricePerSquareMeter > 0
      ? data.averagePricePerSquareMeter : null,
    description: valid
      ? `${priceSampleCount} tin có giá cả phòng; ${excludedPriceCount} tin không đưa vào giá. Giá/m² dựa trên ${priceAreaSampleCount} tin có diện tích.`
      : 'Chưa có dữ liệu giá đủ điều kiện; cần tải lại dữ liệu có đơn vị và số mẫu rõ ràng.',
    canCompare: valid && priceAreaSampleCount! >= 4,
  }
}

export function adminPriceSignal(area: AdminAreaInsight) {
  const evidence = adminPriceEvidence(area)
  return evidence.canCompare && evidence.monthlyPrice !== null && evidence.pricePerSquareMeter !== null
    && area.confidence !== 'low' ? area.priceSignal : 'insufficient_data'
}

export function adminPriceRecommendation(area: AdminAreaInsight) {
  return adminPriceSignal(area) === 'insufficient_data'
    ? 'Chưa đủ mẫu giá cả phòng, diện tích hoặc tương tác để gợi ý điều chỉnh giá.'
    : area.recommendation
}
