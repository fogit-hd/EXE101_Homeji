import type { AiParsedSearchCriteria } from '../../api/types'
import { amenityLabel, formatPrice } from '../../lib/labels'

export type RentalSearchChip = { text: string; edit: string }

/** Refinements edit the existing intent; only the explicit new-search action resets its constraints. */
export function buildRentalSearchChips(c: AiParsedSearchCriteria): RentalSearchChip[] {
  return [
    ...(c.location ? [{ text: c.location, edit: 'Đổi khu vực sang ' }] : []),
    ...(c.priceMax != null ? [{ text: `${c.budgetBasis === 'total' ? 'Cả phí' : 'Tiền thuê'} ≤ ${formatPrice(c.priceMax)}`, edit: 'Đổi ngân sách dưới ' }] : []),
    ...(c.priceMin != null ? [{ text: `Từ ${formatPrice(c.priceMin)}`, edit: 'Từ ' }] : []),
    ...(c.occupants ? [{ text: `${c.occupants} người`, edit: 'Phòng cho ' }] : []),
    ...(c.areaMin != null ? [{ text: `Diện tích ≥ ${c.areaMin} m²`, edit: 'Bỏ diện tích' }] : []),
    ...(c.areaMax != null ? [{ text: `Diện tích ≤ ${c.areaMax} m²`, edit: 'Bỏ diện tích' }] : []),
    ...(c.destination ? [{ text: `Điểm đến: ${c.destination}`, edit: 'Bỏ điểm đến' }] : []),
    ...(c.maxCommuteMinutes ? [{ text: `Đường đi ≤ ${c.maxCommuteMinutes} phút`, edit: 'Bỏ điểm đến' }] : []),
    ...(c.travelMode ? [{ text: c.travelMode === 'DRIVING' ? 'Ô tô' : c.travelMode === 'WALKING' ? 'Đi bộ' : 'Phương tiện công cộng', edit: 'Phương tiện đi học: ' }] : []),
    ...(c.requiredAmenities ?? []).map(code => ({ text: `Cần ${amenityLabel(code)}`, edit: `Không cần ${amenityLabel(code)}` })),
    ...(c.criteria ?? []).map(code => ({ text: `Ưu tiên ${amenityLabel(code)}`, edit: `Không cần ${amenityLabel(code)}` })),
    ...(c.excludedAmenities ?? []).map(code => ({ text: `Không có ${amenityLabel(code)}`, edit: `Không cần ${amenityLabel(code)}` })),
    ...(c.excludeRoommateShare ? [{ text: 'Không ở ghép', edit: 'Chấp nhận ở ghép' }] : []),
  ]
}
