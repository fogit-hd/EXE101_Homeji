# Tốc độ logo ngôi nhà và slogan khi reload

Ngày 17/10/2026. Theo yêu cầu, intro giữ nhịp 1x ở trang mở đầu `/` cho khách; `/login` và `/register` không chạy intro này. Những trang còn lại và trang chủ có phiên đăng nhập chạy timeline vẽ logo/slogan và timeline chuyển về header ở 2x. Không tăng tốc animation loading ngôi sao/HOMEJI hoặc cảnh đăng ký.

Boot script quyết định trước khi React tải; chỉ mount lại ở lần tải trang, không phát lại khi điều hướng SPA. Redirect về đăng nhập hủy overlay và mở lại cuộn trang. Trang không phải home không chờ tín hiệu `markHomeReady()` của HomePage; vẫn giữ giới hạn chờ 10 giây và cơ chế tải dữ liệu hiện hành cho home.

Kiểm tra bản phát hành: build và scoped ESLint đạt; 3 test policy đạt. Browser trên localhost với API giả lập đo guest home 6513 ms, `/terms` 3147 ms, reload `/terms` 3381 ms. Kiểm tra login/register (cả trailing slash), điều hướng SPA và redirect admin chưa đăng nhập đều đạt, không có page error. Đây là thời gian quan sát trên fixture, không phải cam kết thời gian mạng production.

## Thông báo deploy thất bại

Ảnh email do chủ dự án cung cấp báo thất bại cho dịch vụ `EXE101_Homeji` với commit `c3c1b34`. Ảnh không có log nguyên nhân và người dùng xác nhận không có quyền xem log FE. Cùng commit build lại tại máy thành công. Website phát hành duy nhất là https://exe101-homeji.onrender.com.

Sau khi phát hành commit `87f4ccd`, đã xác minh trực tiếp `https://exe101-homeji.onrender.com`: HTTP 200, intro nhanh xuất hiện rồi kết thúc, đăng ký có ô xác nhận mật khẩu và mô hình 3D tải được. Nguyên nhân lần deploy thất bại trước đó vẫn chưa có log để kết luận.
