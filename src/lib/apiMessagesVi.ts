const API_MESSAGE_VI: Record<string, string> = {
  'Invalid login credentials': 'Thông tin tài khoản hoặc mật khẩu không chính xác.',
  'Invalid credentials': 'Thông tin tài khoản hoặc mật khẩu không chính xác.',
  'Email not confirmed': 'Bạn chưa xác nhận email. Hãy mở email Homeji gửi để xác nhận rồi đăng nhập lại.',
  'User already registered': 'Email này đã có tài khoản. Hãy đăng nhập hoặc chọn quên mật khẩu.',
  'Email rate limit exceeded': 'Bạn đã yêu cầu gửi email nhiều lần. Hãy chờ một chút rồi thử lại.',
  'Signup requires a valid password': 'Vui lòng nhập mật khẩu để tạo tài khoản.',
  'The viewing time must be in the future.': 'Chọn giờ xem phòng sau thời điểm hiện tại.',
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
    'Bạn đã có lịch hẹn cho phòng này. Hãy kiểm tra lịch xem phòng trước khi đặt thêm.',
}

/** Đổi thông báo lỗi tiếng Anh từ API sang tiếng Việt khi có bản dịch. */
export function localizeApiMessage(message: string): string {
  const trimmed = message.trim()
  const normalized = trimmed.replace(/[.!]+$/, '').toLowerCase()
  const match = Object.entries(API_MESSAGE_VI).find(([source]) => source.replace(/[.!]+$/, '').toLowerCase() === normalized)
  return match?.[1] ?? trimmed
}
