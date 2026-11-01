# Thứ tự hộp thư

- Danh sách luôn được sắp xếp theo hoạt động mới nhất trước khi tìm kiếm/lọc, gồm tải ban đầu và làm mới tự động. Không phụ thuộc thứ tự mảng API.
- Hội thoại được mở qua thao tác chọn người nhận/“Gửi tin nhắn” được ưu tiên ngay trong phiên giao diện hiện tại. Lần gửi/nhận mới hơn tiếp tục lên đầu. Không thay đổi thời gian tin nhắn trong dữ liệu hoặc đẩy cuộc trò chuyện lên hộp thư của người bên kia khi chưa gửi gì.
- Chỉ mở đọc hàng hội thoại không tạo dấu thời gian tin mới. Ưu tiên chọn người nhận là trạng thái giao diện, không lưu lịch sử hoạt động giả vào backend.
- Thời gian thiếu/không hợp lệ dùng ngày tạo để so sánh; cùng thời gian dùng ID làm thứ tự ổn định. Không sửa mảng nguồn.

`node tests/conversation-order.e2e.mjs` trước sửa thất bại: chọn Peer A nhưng hàng đầu là Peer B. Sau sửa qua các trường hợp chọn người nhận, nhận tin mới, đổi người nhận, gửi tin mới và làm mới từ API cố tình không sắp xếp.

453/453 unit/contract tests qua; build và ESLint các file sửa qua. Luồng nhận tin tự động, kết nối lại, fallback, tab ẩn, giữ bản nháp và phản hồi muộn khi đổi hội thoại vẫn qua Playwright. Kiểm tra dùng API và sự kiện giả lập, không gửi tin tới người thật.

Ảnh kiểm tra: `output/verification/conversation-order/newest-first.png`. Phiên bản production đối chiếu tại `output/verification/conversation-order/release.json`.
