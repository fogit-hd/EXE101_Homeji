# Tốc độ logo ngôi nhà và slogan khi reload

## Quy tắc hiện tại — 21/10/2026

Chỉ mở trực tiếp URL gốc `/` (không query/hash) mới phát intro logo/slogan, cho cả khách và người đã đăng nhập. Các URL có `?section=...`, ví, lịch sử, bản đồ, chi tiết tin, các đường dẫn con và callback thanh toán mở ngay, không có boot overlay và không khóa cuộn. Chuyển mục hoặc quay về trang chủ bằng điều hướng SPA không phát lại intro. Boot script kiểm tra trước khi React tải; React kiểm tra lại và dọn trạng thái nếu rời trang chủ giữa lúc intro đang chạy.

Nhịp phát trên trang chủ vẫn là 1x cho khách lần đầu trong tab và 3x cho những lần tiếp theo/người đã đăng nhập. Quy tắc này thay thế phạm vi phát trên các trang ứng dụng trong ghi chú lịch sử bên dưới.

Ngày 17/10/2026. Theo yêu cầu, intro giữ nhịp 1x ở trang mở đầu `/` cho khách; `/login` và `/register` không chạy intro này. Những trang còn lại và trang chủ có phiên đăng nhập chạy timeline vẽ logo/slogan và timeline chuyển về header ở 2x. Không tăng tốc animation loading ngôi sao/HOMEJI hoặc cảnh đăng ký.

Boot script quyết định trước khi React tải; chỉ mount lại ở lần tải trang, không phát lại khi điều hướng SPA. Redirect về đăng nhập hủy overlay và mở lại cuộn trang. Trang không phải home không chờ tín hiệu `markHomeReady()` của HomePage; vẫn giữ giới hạn chờ 10 giây và cơ chế tải dữ liệu hiện hành cho home.

Kiểm tra bản phát hành: build và scoped ESLint đạt; 3 test policy đạt. Browser trên localhost với API giả lập đo guest home 6513 ms, `/terms` 3147 ms, reload `/terms` 3381 ms. Kiểm tra login/register (cả trailing slash), điều hướng SPA và redirect admin chưa đăng nhập đều đạt, không có page error. Đây là thời gian quan sát trên fixture, không phải cam kết thời gian mạng production.

## Thông báo deploy thất bại

Ảnh email do chủ dự án cung cấp báo thất bại cho dịch vụ `EXE101_Homeji` với commit `c3c1b34`. Ảnh không có log nguyên nhân và người dùng xác nhận không có quyền xem log FE. Cùng commit build lại tại máy thành công. Website hiện tại là https://homeji.onrender.com; các kết quả phát hành cũ bên dưới là bằng chứng lịch sử trước khi đổi hostname.

Sau khi phát hành commit `87f4ccd`, đã xác minh trực tiếp `https://exe101-homeji.onrender.com`: HTTP 200, intro nhanh xuất hiện rồi kết thúc, đăng ký có ô xác nhận mật khẩu và mô hình 3D tải được. Nguyên nhân lần deploy thất bại trước đó vẫn chưa có log để kết luận.


## Cập nhật 18/10/2026: 3x

Chỉ intro trang chủ khách lần đầu trong tab giữ 1x. Sau khi intro đã hoàn tất, trang chủ khách cũng chạy 3x; các trang ứng dụng và trang chủ có đăng nhập chạy 3x. Timeline vẽ logo, chữ slogan và timeline rời màn hình dùng cùng playback rate. Các lần phát nhanh không chờ tín hiệu HomePage; giới hạn chờ được chia theo playback rate. Điều hướng SPA không phát lại intro; login/register vẫn có trải nghiệm riêng.

4 kiểm tra policy đạt. Chưa đo lại thời gian hiển thị bằng trình duyệt vì local browser use đang bị tắt trong Work settings; số đo 2x bên trên chỉ là lịch sử.
