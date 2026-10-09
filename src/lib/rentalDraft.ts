export interface RentalDraftFacts {
  typeLabel: string
  address: string
  rent: string
  area: string
  amenities: string[]
  imageCount: number
}

/** Only structured owner inputs become claims. Free text and photos are never instructions. */
export function buildRentalDraft(facts: RentalDraftFacts) {
  const missing: string[] = []
  const positive = (value: string, ceiling: number) => {
    const number = Number(value)
    return value.trim() && Number.isFinite(number) && number > 0 && number <= ceiling ? number : null
  }
  const rent = positive(facts.rent, 1_000_000_000)
  const area = positive(facts.area, 100_000)
  const address = facts.address.trim().slice(0, 500)
  if (rent === null) missing.push('Giá thuê hợp lệ')
  if (area === null) missing.push('Diện tích do chủ tin xác nhận')
  if (!address) missing.push('Địa chỉ cụ thể')
  if (facts.imageCount < 3) missing.push('Ít nhất 3 ảnh thật có quyền sử dụng')
  missing.push('Đơn vị và đơn giá điện, nước, internet; điều kiện cọc và hợp đồng')
  const number = (value: number) => value.toLocaleString('vi-VN')
  const title = [facts.typeLabel, area !== null ? `${number(area)} m²` : null, rent !== null ? `${number(rent)} đ/tháng` : null].filter(Boolean).join(' · ').slice(0, 200)
  const description = [
    `${facts.typeLabel}.`,
    address ? `Địa chỉ chủ tin cung cấp: ${address}.` : null,
    rent !== null ? `Tiền thuê: ${number(rent)} đồng/tháng.` : null,
    area !== null ? `Diện tích chủ tin khai báo: ${number(area)} m².` : null,
    facts.amenities.length ? `Tiện ích chủ tin đã chọn: ${facts.amenities.join(', ')}.` : null,
    'Vui lòng trao đổi với chủ tin về tình trạng phòng, các khoản phí, tiền cọc và điều kiện hợp đồng trước khi quyết định.',
  ].filter(Boolean).join('\n').slice(0, 4000)
  return { title, description, missing }
}
