const API_MESSAGE_VI: Record<string, string> = {
  'The viewing time must be in the future.': 'Thời gian xem phòng phải ở tương lai.',
  'This viewing appointment can no longer be cancelled.':
    'Lịch xem phòng này không còn hủy được nữa.',
  'This viewing appointment can no longer be rescheduled.':
    'Lịch xem phòng này không còn đổi giờ được nữa.',
  'Only confirmed viewing appointments can be completed.':
    'Chỉ lịch xem phòng đã xác nhận mới có thể hoàn tất.',
  'Only pending viewing appointments can be updated by the owner.':
    'Chỉ lịch xem phòng đang chờ mới được chủ tin cập nhật.',
  'Only appointment participants can propose another viewing time.':
    'Chỉ người tham gia lịch hẹn mới có thể đề xuất giờ xem khác.',
  'Rental post owners cannot request a viewing for their own post.':
    'Chủ tin đăng không thể tự đặt lịch xem phòng cho tin của mình.',
  'You already have an active viewing appointment for this rental post.':
    'Bạn đã có lịch xem phòng đang hoạt động cho tin này.',
}

/** Đổi thông báo lỗi tiếng Anh từ API sang tiếng Việt khi có bản dịch. */
export function localizeApiMessage(message: string): string {
  const trimmed = message.trim()
  return API_MESSAGE_VI[trimmed] ?? trimmed
}
