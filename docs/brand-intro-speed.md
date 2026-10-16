# Tốc độ logo ngôi nhà và slogan khi reload

Ngày 17/10/2026. Theo yêu cầu, intro giữ nhịp 1x ở trang mở đầu `/` cho khách; `/login` và `/register` không chạy intro này. Những trang còn lại và trang chủ có phiên đăng nhập chạy timeline vẽ logo/slogan và timeline chuyển về header ở 2x. Không tăng tốc animation loading ngôi sao/HOMEJI hoặc cảnh đăng ký.

Boot script quyết định trước khi React tải; chỉ mount lại ở lần tải trang, không phát lại khi điều hướng SPA. Redirect về đăng nhập hủy overlay và mở lại cuộn trang. Trang không phải home không chờ tín hiệu `markHomeReady()` của HomePage; vẫn giữ giới hạn chờ 10 giây và cơ chế tải dữ liệu hiện hành cho home.

Kiểm tra bản phát hành: build và scoped ESLint đạt; 3 test policy đạt. Browser trên localhost với API giả lập đo guest home 6513 ms, `/terms` 3147 ms, reload `/terms` 3381 ms. Kiểm tra login/register (cả trailing slash), điều hướng SPA và redirect admin chưa đăng nhập đều đạt, không có page error. Đây là thời gian quan sát trên fixture, không phải cam kết thời gian mạng production.

## Thông báo deploy thất bại

Ảnh email do chủ dự án cung cấp báo thất bại cho dịch vụ `EXE101_Homeji` với commit `c3c1b34`. Ảnh không có log nguyên nhân và người dùng xác nhận không có quyền xem log FE. Cùng commit build lại tại máy thành công; dịch vụ Render đang truy cập được `srv-davlfje0tbcc73eeag1g` (hostname `exe101-homeji-qlcu.onrender.com`) đã báo Live cho commit đó trong lần kiểm tra trước.

Không xác định nguyên nhân và không khẳng định đã sửa deploy ở hostname gốc `exe101-homeji.onrender.com`. Cần chủ dịch vụ gốc cung cấp build/deploy log hoặc quyền truy cập trước khi sửa cấu hình riêng của dịch vụ; không đổi cấu hình hoặc dependency theo phỏng đoán.
