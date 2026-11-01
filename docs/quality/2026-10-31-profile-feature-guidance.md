# Hướng dẫn hoàn thiện hồ sơ trước thao tác

Ngày 31/10/2026. Chỉ thay đổi frontend local; chưa deploy và không sửa chính sách backend trong lượt này.

## Nguyên nhân đã tái hiện

`RoomDetailModal` gọi API dù AuthContext đã biết thiếu hồ sơ, sau đó gộp phản hồi `profile_required` vào trạng thái không tải được chi tiết. Người dùng chỉ thấy nút thử lại thay vì đường dẫn hoàn thiện hồ sơ. Test browser trước sửa thất bại vì không có link Cập nhật hồ sơ.

## Thay đổi

- Notice dùng chung nêu tác vụ cụ thể: “Vui lòng cập nhật hồ sơ để xem thông tin phòng”, kèm hướng dẫn lưu tên ở Thông tin cơ bản và CTA Cập nhật hồ sơ.
- Room modal kiểm tra trước API; mã profile_required từ server cũng chuyển sang notice. Lỗi mạng/dịch vụ, 403 quyền khác và 404/410 tin đã gỡ vẫn được phân biệt. Thông báo lỗi tải giữ lý do đã được getErrorMessage làm sạch.
- ProfileGate chặn mount tính năng cần hồ sơ trong các mục tài khoản ở MapAppPanel. ProtectedRoute giữ /profile truy cập được; tin nhắn, composer AI và chi tiết phòng trên bản đồ có kiểm tra riêng. Các lượt đọc detail/saved nền và seller alerts không bắt đầu khi đã biết thiếu hồ sơ.
- CTA làm mới trạng thái hồ sơ, đóng overlay liên quan, chuyển đến hồ sơ và giữ returnTo trong Homeji. Không tự thực hiện lại thanh toán hoặc thao tác ghi sau khi lưu hồ sơ.
- Chỉ yêu cầu hồ sơ cơ bản đã lưu theo trạng thái AuthContext. Không dùng onboardingCompleted/lối sống tùy chọn làm điều kiện bắt buộc mới.

## Kiểm chứng

- `node tests/profile-feature-guidance.e2e.mjs`: 5 tình huống với API giả lập local. Khi biết thiếu hồ sơ: 0 GET detail. Khi server trả profile_required: hướng dẫn đúng sau 1 GET. 503, 403 access_denied và 404 không bị đổi thành yêu cầu hồ sơ. CTA đóng modal và mở mục hồ sơ.
- `node --test tests/profile-feature-gate.test.mjs tests/profile-setup.test.mjs tests/error-recovery.test.mjs tests/chatbot-context-recovery.test.mjs`: 40 tests qua. Gate không mount effect tính năng trước khi lưu, mở lại sau khi có hồ sơ cơ bản và không chặn trình sửa hồ sơ.
- ESLint các module sửa và build production qua; còn cảnh báo chunk lớn sẵn có. `git diff --check` qua.
- Ảnh kiểm thử: `output/verification/profile-feature-guidance/known.png` và các tình huống cùng thư mục. Không phải bằng chứng đã kiểm tra hoặc sửa production.
