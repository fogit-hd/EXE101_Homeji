export function agentMissingFields(details: import('../api/chatbotAgent').AgentPostDetails): string[] {
  const kind = details.kind ?? 'secondHand', missing: string[] = []
  if (!details.title.trim()) missing.push('tiêu đề')
  if (!details.description.trim()) missing.push('mô tả')
  if (!(details.price > 0)) missing.push('giá/ngân sách')
  if (!details.address.trim()) missing.push('địa chỉ/khu vực')
  if (kind !== 'wanted' && (!details.latitude || !details.longitude)) missing.push('vị trí trên bản đồ')
  if (['rental', 'roommate', 'roomTransfer'].includes(kind)) {
    if (details.deposit == null || details.deposit < 0) missing.push('tiền cọc')
    if (!(details.area! > 0)) missing.push('diện tích')
    if (!(details.maxOccupants! > 0)) missing.push('số người tối đa')
    if (!(details.availableSlots! > 0) || details.availableSlots! > details.maxOccupants!) missing.push('chỗ trống')
  }
  if (kind === 'wanted') { if (!(details.maxOccupants! > 0)) missing.push('số người thuê'); if (!details.availableFrom) missing.push('ngày chuyển vào') }
  if (kind === 'food') { if (!(details.availableQuantity! > 0)) missing.push('số lượng'); if (!details.unit?.trim()) missing.push('đơn vị bán'); if (details.preparationMinutes == null || details.preparationMinutes < 0) missing.push('thời gian chuẩn bị') }
  if (kind === 'roomTransfer') {
    if (!details.transferKind) missing.push('hình thức pass')
    if (!details.availableFrom || !details.originalLeaseEndsOn || details.originalLeaseEndsOn <= details.availableFrom) missing.push('thời hạn hợp đồng')
    if (details.passFee == null || details.passFee < 0) missing.push('phí pass')
    if (!details.transferReason?.trim()) missing.push('lý do pass')
    if (!details.ownerConsentConfirmed || !details.ownerConsentContact?.trim()) missing.push('xác nhận và liên hệ chủ nhà')
  }
  return missing
}
