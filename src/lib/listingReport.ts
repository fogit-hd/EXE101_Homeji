/** Limits mirror Homeji.Domain.Entities.Report on the backend. */
export const REPORT_REASON_MAX_LENGTH = 120
export const REPORT_DESCRIPTION_MAX_LENGTH = 1_000

export const LISTING_REPORT_REASONS = [
  { id: 'scam', label: 'Có dấu hiệu lừa đảo hoặc đòi chuyển tiền trước' },
  { id: 'unavailable', label: 'Phòng đã cho thuê hoặc không còn' },
  { id: 'wrong-info', label: 'Sai giá, địa chỉ hoặc thông tin phòng' },
  { id: 'fake-photos', label: 'Ảnh không đúng thực tế' },
  { id: 'spam', label: 'Tin trùng lặp hoặc spam' },
  { id: 'other', label: 'Lý do khác' },
] as const

export type ListingReportReasonId = (typeof LISTING_REPORT_REASONS)[number]['id']

export type ListingReportDraft = { reasonId: ListingReportReasonId | null; description: string }

export type ListingReportResult =
  | { ok: true; reason: string; description: string | undefined }
  | { ok: false; error: string }

export function validateListingReport(draft: ListingReportDraft): ListingReportResult {
  const reason = LISTING_REPORT_REASONS.find(item => item.id === draft.reasonId)
  if (!reason) return { ok: false, error: 'Chọn một lý do báo cáo.' }
  const description = draft.description.trim()
  if (description.length > REPORT_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: `Mô tả tối đa ${REPORT_DESCRIPTION_MAX_LENGTH} ký tự.` }
  }
  if (reason.id === 'other' && !description) {
    return { ok: false, error: 'Mô tả ngắn vấn đề bạn gặp để đội kiểm duyệt xử lý.' }
  }
  return { ok: true, reason: reason.label, description: description || undefined }
}
