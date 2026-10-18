# Mua gói bằng ví Homeji

Mua gói hiển thị thêm số dư ví, trạng thái không đủ tiền và liên kết nạp ví. Chọn ví mở bước xác nhận gói, tổng tiền và số dư dự kiến sau thanh toán; chỉ nút xác nhận mới gửi yêu cầu. Giá được backend kiểm tra lại.

`POST /api/subscriptions/premium/{packageCode}/wallet` nhận `{ requestId, expectedAmount }`. Request ID được giữ trong sessionStorage để các lần thử lại sau timeout sử dụng cùng ID. Backend chỉ trừ một lần cho cùng người dùng/request ID và từ chối đổi gói hoặc số tiền cho ID đã hoàn tất. Không tự thử lại request từ frontend.

Sau thành công: số dư, lịch sử, quyền Premium và hồ sơ được tải lại. Lịch sử thanh toán ghi phương thức ví; sổ ví phân loại Mua gói Premium. Biên nhận và email HTML/PDF đi qua outbox hiện có. Không đi qua trang QR chờ thanh toán.

Backend: một transaction lưu debit, ledger, payment Paid, subscription và receipt/outbox; lỗi ở bất cứ bước nào rollback toàn bộ. Khóa theo người dùng và wallet Version bảo vệ yêu cầu đồng thời. Không có schema mới vì enum đã lưu dạng số nguyên.

Kiểm tra PostgreSQL cục bộ: replay đồng thời, hai giao dịch tranh số dư, giá sai/thiếu tiền, rollback khi receipt lỗi, gia hạn và replay sau đổi giá. Tổng 462 unit + 188 integration, không lỗi/skip. Chưa kiểm tra UI thực tế trong lượt này do trình duyệt cục bộ bị tắt; chưa thực hiện thanh toán tiền thật production.


Xác minh production 18/10/2026: API mới từ chối request ID rỗng và ví 0 đồng (400, trường wallet); lịch sử vẫn rỗng, tài khoản chưa có Premium. Tài khoản thử đã xóa. Tệp JS đang phục vụ có lựa chọn ví, bước xác nhận và cơ chế giữ request ID. Bundle intro đã có quy tắc 1x/3x.

Bộ frontend tổng quát: 228/231 đạt; ba lỗi admin-assistant-entry, hub-palette, notification-popup tái hiện y hệt trên bản trước thay đổi này. Kiểm tra riêng intro/payment lifecycle: 9/9 đạt. Giao dịch ví thanh toán ngay không hiển thị hạn chờ cổng thanh toán 15 phút.
