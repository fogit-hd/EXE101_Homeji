# Chat, số tiền và phát hành — 01/11/2026

- Chat AI có một nút Ghi âm: Dừng ghi tự gọi chuyển lời nói thành bản nháp, không gửi tin nhắn. Bản nháp có thể sửa. Thất bại giữ bản ghi để nghe lại/thử lại. Chat giữa người dùng vẫn nghe lại rồi gửi âm thoại.
- Chat áp dụng ngay kết quả tìm phòng lên bản đồ và giữ hội thoại mở. Các tiêu chí thiếu phí, điểm đến, thời gian đi hoặc đơn vị giá vẫn cần làm rõ. Không tự nới ngân sách khi không có kết quả.
- Nước nóng/máy nước nóng/bình nóng lạnh dùng WATER_HEATER; gộp alias của máy lạnh, bỏ chip ưu tiên trùng với tiện ích bắt buộc. Phủ định và bỏ yêu cầu giữ nguyên ý nghĩa riêng.
- MoneyInput dùng chung cho giá, cọc, ngân sách, số tiền nạp/rút và số nguyên. Hiển thị dấu chấm khi nhập, giữ chuỗi chữ số trong state/payload. Giữ kiểm tra min/max/required; hỗ trợ sửa giữa số, dán, xóa sát dấu phân cách. Diện tích và mức tiêu thụ có số lẻ giữ ô thập phân. Không áp dụng cho điện thoại, OTP, số tài khoản.
- Điều chỉnh harness cũ theo các hợp đồng đang có: MoneyInput, kiểm tra vùng dịch vụ, khóa chỉnh địa chỉ khi geocode, debounce gợi ý địa chỉ và tên nút hiện tại. Không thay đổi logic lưu tin thuê.

## Kiểm tra local

- Frontend: 450/450 unit/contract tests, build production và ESLint các file thay đổi qua.
- Playwright thực thi AudioWorklet/micro giả lập: ảnh, retry, tự điền bản nháp khi dừng, không tự gửi, hủy ghi, từ chối micro; 390px sáng và 1280px tối qua. API/provider trong kiểm tra này được giả lập.
- Playwright số tiền: tách chấm từng phím, gửi chữ số gốc, sửa giữa số, xóa dấu phân cách không đổi giá trị, dán, giới hạn và ô bắt buộc qua.
- Chat kiểm tra áp dụng đúng một lần khi rõ tiêu chí, không áp dụng khi còn thiếu phí/đường đi, giữ chat mở.
- Browser regression game/WebGL, hồ sơ và danh sách phòng qua; GPU đo trên máy tính, chưa đo điện thoại vật lý.
- Backend Release: 608 unit tests + 239 integration tests qua; 50 integration tests tùy cấu hình bị bỏ qua. Một kiểm tra kiến trúc có sẵn thất bại vì ChatMediaController nhận IConfiguration, đã xác nhận tồn tại ở HEAD trước thay đổi. Lần chạy kiểm tra release loại riêng kiểm tra có sẵn này; không ghi nhận toàn bộ backend suite xanh.

## Deploy

Backend commit: `2d543ed`; Render xác nhận Live và `/health/version?release=2d543ed` trả đúng commit, readiness HTTP 200. Frontend đã hợp nhất nhánh chính đến `93e170a`, giữ các cập nhật chủ nhà xác minh, marker bản đồ, AI moderation và MoneyInput dùng chung. Trạng thái và chứng cứ production được ghi sau khi đối chiếu phiên bản/bundle đang phục vụ.
