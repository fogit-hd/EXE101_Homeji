export const helpFaq = [
  { id: 'nearby', group: 'Tìm phòng', question: 'Làm sao tìm phòng gần trường hoặc nơi làm?', answer: 'Mở Tìm phòng, chọn chip trường hoặc tuyến metro ở đầu danh sách, hoặc gõ tên khu vực vào ô tìm kiếm. Bấm vào ghim giá trên bản đồ để xem nhanh phòng.', link: { label: 'Mở Tìm phòng', to: '/?section=listings' } },
  { id: 'filters', group: 'Tìm phòng', question: 'Lọc theo giá, diện tích, tiện ích ở đâu?', answer: 'Bấm nút Bộ lọc cạnh danh sách. Số trên nút cho biết đang bật bao nhiêu bộ lọc. Bấm nút Xem kết quả (có kèm số phòng tìm được) ở cuối bảng lọc để áp dụng.', link: { label: 'Mở Tìm phòng', to: '/?section=listings' } },
  { id: 'searches', group: 'Tìm phòng', question: 'Lưu tìm kiếm để xem lại sau thế nào?', answer: 'Trong Bộ lọc, bấm Lưu tìm kiếm này. Homeji sẽ báo khi có phòng mới khớp với tìm kiếm của bạn trong mục Báo phòng mới.', link: { label: 'Mở Tìm phòng', to: '/?section=listings' } },
  { id: 'consider', group: 'Tìm phòng', question: 'Cân nhắc là gì?', answer: 'Bấm Thêm vào cân nhắc trên thẻ phòng hoặc trong trang chi tiết. Sau đó mở Phòng đã lưu để so sánh giá thuê, diện tích và chi phí của các phòng bạn đang phân vân.', link: { label: 'Xem phòng đã lưu', to: '/?section=saved' } },
  { id: 'appointments', group: 'Xem phòng và liên hệ', question: 'Đặt lịch xem phòng thế nào?', answer: 'Trong trang chi tiết phòng, bấm Đặt lịch xem phòng rồi chọn ngày giờ. Lịch đã đặt nằm trong mục Lịch xem phòng.', link: { label: 'Lịch xem phòng', to: '/?section=appointments' } },
  { id: 'contact', group: 'Xem phòng và liên hệ', question: 'Liên hệ chủ nhà bằng cách nào?', answer: 'Trong trang chi tiết phòng, bấm Nhắn tin để trò chuyện ngay trên Homeji. Gọi điện hoặc Zalo nằm trong mục Liên hệ khác.' },
  { id: 'safety', group: 'Xem phòng và liên hệ', question: 'Làm sao tránh bị lừa khi thuê phòng?', answer: 'Chỉ đặt cọc sau khi đã xem phòng tận nơi và có giấy tờ rõ ràng. Không chuyển tiền cho người lạ qua link lạ. Nếu thấy tin đáng ngờ, bấm Báo cáo tin này trong trang chi tiết phòng.' },
  { id: 'roommates', group: 'Ở ghép', question: 'Tìm bạn ở ghép thế nào?', answer: 'Mở Ở ghép, bấm Cập nhật thông tin ở ghép để điền ngân sách, khu vực và thói quen sinh hoạt. Sau đó ở tab Tìm bạn, bấm Mời kết nối với người phù hợp.', link: { label: 'Ở ghép', to: '/?section=invitations' } },
  { id: 'wallet', group: 'Ví và Premium', question: 'Nạp tiền vào Ví Homeji thế nào?', answer: 'Mở Chợ Homeji, chọn tab Ví Homeji rồi chọn Nạp tiền. Chọn số tiền và phương thức thanh toán. Bạn cũng có thể bấm vào số dư ví ở đầu trang Chợ.', link: { label: 'Mở Ví Homeji', to: '/?section=marketplace&wallet=deposit' } },
  { id: 'premium', group: 'Ví và Premium', question: 'Premium có gì?', answer: 'Tin đăng của bạn có nhãn Premium, khung viền nổi bật và được ưu tiên hiển thị. Bạn theo dõi được nhiều khu vực hơn, so sánh nhiều phòng hơn và dùng Trợ lý Agent AI không giới hạn. Bảng So sánh quyền lợi trong trang Gói Premium ghi rõ từng mục.', link: { label: 'Gói Premium', to: '/?section=payments' } },
  { id: 'profile', group: 'Tài khoản', question: 'Đổi thông tin cá nhân ở đâu?', answer: 'Mở menu tài khoản, chọn Hồ sơ, rồi bấm Chỉnh sửa ở mục cần đổi.', link: { label: 'Hồ sơ', to: '/?section=profile' } },
]

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi').trim()

export function filterHelpFaq(query: string) {
  const words = normalize(query).split(/\s+/)
  return helpFaq.filter(item => words.every(word => normalize(`${item.question} ${item.answer} ${item.group}`).includes(word)))
}
