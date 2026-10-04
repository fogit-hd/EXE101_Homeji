# Thanh toán và thời hạn 15 phút

Frontend: `C:\EXE101_Homeji`. Backend: `C:\Homeji`.

## Nguyên nhân và thay đổi

Trước đây API trả trạng thái đã lưu mà không kiểm tra tuổi đơn; không có tác vụ
hủy giao dịch thanh toán quá hạn. Frontend dùng cùng màu xanh cho `Pending` và
`Completed`, không có trang theo dõi riêng.

- `PaymentTransaction.PaymentLifetime` là 15 phút. Đơn `Pending` chuyển thành
  `Cancelled` khi `CreatedAt + 15 phút <= giờ UTC của backend`.
- `PaymentExpirationWorker` quét khi khởi động và mỗi 15 giây. Hoạt động khi
  `BackgroundJobs:Enabled` bật (mặc định); không phụ thuộc trình duyệt.
- API lịch sử, tra theo ID và mã đơn kiểm tra thời hạn trước khi trả dữ liệu.
  Việc hủy trong API chỉ áp dụng cho đơn của người dùng đang đăng nhập.
- Repository dùng một SQL UPDATE có điều kiện `status = Pending`; trạng thái
  là concurrency token để webhook dùng dữ liệu cũ không ghi đè trạng thái mới.
- Link PayOS mới có `expiredAt` trùng thời hạn backend; định dạng theo
  [API PayOS](https://payos.vn/docs/api/).
- `PaymentDto.expiresAt` được bổ sung; giá trị enum cũ giữ nguyên. FE nhận được
  `Expired = 5` từ các dữ liệu cũ và có fallback `createdAt + 15 phút` khi API
  chưa trả trường mới. Không thêm cột DB; không cần migration cho thay đổi này.

## Trang chờ

`/payments/wait?paymentId=...` hoặc `?orderCode=...` theo dõi một giao dịch.
Tạo đơn từ trang gói dẫn đến trang chờ. URL trả về cũ `/payments` và
`/?section=payments` có mã đơn được chuyển tiếp sang trang chờ.

Trang kiểm tra trạng thái mỗi 5 giây khi đang chờ, kiểm tra ngay khi quay lại
tab hoặc có mạng, dừng khi backend xác nhận trạng thái cuối. Không tạo đơn mới
khi tải lại. Khi đếm ngược về 0, nút thanh toán bị ẩn; trang vẫn chờ backend
xác nhận hủy, không tự giả lập trạng thái DB. Tham số như `resultCode=0` hoặc
`providerStatus=PAID` không được dùng để xác nhận thành công.

Giao diện lịch sử có bộ lọc, thống kê từ 30 giao dịch mới nhất và chi tiết bên
cạnh; mobile xếp theo chiều dọc. Đã bỏ số liệu sử dụng gói viết cứng trước đây.

## Callback và tương thích

Đơn đã trả tiền hoặc đã thất bại không bị tác vụ hủy thay đổi. Callback thất bại
đến muộn không làm đơn đã hủy chuyển thành thất bại. Callback thành công đã kiểm
tra chữ ký và số tiền vẫn ghi nhận tiền thực nhận, kể cả nếu đến sau tác vụ hủy;
giữ luồng kích hoạt gói/nạp ví hiện có và tránh bỏ mất khoản đã thanh toán.
Concurrency conflict cần được cổng thanh toán gửi lại theo cơ chế webhook.

MoMo vẫn dùng API và chữ ký hiện có; chính sách 15 phút được thực thi trên Homeji.
Thay đổi này không gửi yêu cầu hủy link MoMo đang mở ở bên ngoài Homeji. Tài liệu
[MoMo One-Time Payments](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/)
không liệt kê tham số thời hạn cho API hiện tại, nên không thêm tham số suy đoán.

SQL quét theo `status` và `created_at`. Khi bảng giao dịch tăng lớn, nên bổ sung
partial index trên `created_at WHERE status = 1` bằng migration riêng để hạn chế
quét toàn bảng; các API theo người dùng đã có index `user_id`.

## Kiểm chứng và triển khai

- `npm run build` và ESLint các file thay đổi.
- `node --test tests/payment-lifecycle.test.mjs` kiểm tra mốc 15 phút,
  thời hạn server, timezone, ngày không hợp lệ và URL thanh toán.
- `node tests/payment-flow.e2e.mjs` với Playwright và Vite local kiểm tra cả
  desktop/mobile, bộ lọc, reload, callback URL, polling, hết hạn, tạo MoMo/PayOS,
  lỗi API và retry. API trong kiểm thử hoàn toàn giả lập, không phát sinh đơn thật.
  Có thể đặt `HOMEJI_PLAYWRIGHT_MODULE` thành đường dẫn module Playwright có sẵn.
- Backend: `dotnet test tests/Homeji.Api.IntegrationTests --filter
  FullyQualifiedName~PaymentExpirationTests --no-restore -v quiet` (chạy trong
  `C:\Homeji`) kiểm tra dịch vụ với clock cố định và repository giả lập, payload
  PayOS, concurrency mapping và đồng bộ model snapshot.

Cần triển khai cả FE và BE để chính sách hủy hoạt động trên website đang chạy.
Không có thao tác cập nhật database production hoặc thanh toán gateway thật
trong quá trình kiểm thử. Tác vụ nền có độ trễ quét tối đa khoảng 15 giây sau
thời hạn; API đọc đơn kiểm tra ngay tại mốc hết hạn.
