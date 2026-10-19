# Chọn ngân hàng và nút rút tiền — 19/10/2026

Ô ngân hàng là editable combobox: gợi ý theo tên đầy đủ/viết tắt không dấu, click hoặc ArrowUp/Down + Enter để chọn, Escape/Tab đóng, cho nhập tên khác. Giữ nguyên chuỗi tên tài khoản đã xác minh và validation/server contract. Không ép mọi người dùng vào danh sách hữu hạn.

Danh sách lưu sẵn từ https://api.vietqr.io/v2/banks, kiểm tra 19/10/2026; chỉ dùng mục tên ngân hàng, không lấy ví điện tử. Đây là gợi ý tên, không phải xác nhận ngân hàng hỗ trợ rút tiền hay kiểm tra tài khoản. Form không gọi dịch vụ ngoài khi nhập.

CTA rút tiền có nền teal đậm/chữ trắng ở light, nền teal sáng/chữ tối ở dark; giữ trạng thái disabled/busy và điều kiện số dư/danh sách yêu cầu. Không sửa backend.

Build và ESLint component qua; full suite 293/293 qua. E2E lựa chọn, phím, nhập tự do, payload giữ nguyên, nút nổi bật và responsive light/dark 320/390/1440 qua. Request rút tiền được intercept và trả lỗi giả lập, không thực hiện giao dịch thật. Ảnh tại output/verification/withdraw-bank.
