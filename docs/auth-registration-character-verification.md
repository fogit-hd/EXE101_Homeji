# Đăng ký: xác nhận mật khẩu và nhân vật realtime

Ngày: 16/10/2026. Bản phát hành được chuẩn bị theo yêu cầu deploy ngày 16/10/2026 từ main 6cb83bc. Build, 8 test và toàn bộ kịch bản browser dưới đây đã chạy lại trên bản phát hành. Trạng thái production được xác minh và ghi riêng sau khi push.

## Hành vi

- `/register` thay cảnh thành phố và các nút điều khiển cảnh bằng RobotExpressive 3D lưu trong dự án. `/login` giữ cảnh hiện có.
- Animation loop hoạt động liên tục khi tab hiển thị: Idle, thở nhẹ, chớp mắt và Wave định kỳ. Hướng đầu theo `pointermove` trên trang, không cần click; phản ứng theo tiến độ nhập tên/email.
- Hai ô mật khẩu đều tự kích hoạt nhắm mắt, biểu cảm Surprised và pose tay che mặt. Bật hiển thị mật khẩu vẫn giữ trạng thái che mặt.
- Form thường và luồng intro dùng chung kiểm tra mật khẩu tối thiểu 6 ký tự, xác nhận bắt buộc, khớp chính xác cả hoa/thường/khoảng trắng. Không thêm trường xác nhận vào API.
- Scene chỉ nhận trạng thái và tiến độ nhập trường không phải mật khẩu, không nhận nội dung mật khẩu. Không gọi dịch vụ 3D bên ngoài; model self-host. Có fallback khi tải model/WebGL thất bại.
- Khi tab ẩn hoặc người dùng bật reduced motion, dừng animation loop. Reduced motion vẫn phản hồi bằng pose tĩnh. Dispose renderer, geometry, material, texture và skeleton khi rời trang.

Nguồn, giấy phép và giới hạn của model: [nghiên cứu nguồn](research/auth-interactive-character.md), `public/models/auth/LICENSE.md`. Pose che mặt và mí mắt được bổ sung trong code, không phải clip có sẵn của model.

## Bằng chứng

- `npm run build` thành công.
- 8 test đăng ký/password, auth loading và auth layout đạt.
- ESLint cho `AuthCharacterScene.tsx` và `userInputValidation.ts` đạt. `AuthPage.tsx` còn 14 lỗi/2 cảnh báo hooks; kiểm tra cùng file ở HEAD có đúng 14 lỗi/2 cảnh báo, không kết luận toàn repo lint sạch.
- `tests/auth-registration.e2e.mjs` chạy trên localhost, chặn mọi request ngoài localhost và mock API đăng ký; không tạo tài khoản thật.
- So sánh ảnh canvas ở thời điểm khác nhau xác nhận idle hoạt động không click. So sánh ảnh khi reduced motion tắt animation nền xác nhận pointermove riêng vẫn thay đổi hướng nhìn.
- Browser xác nhận hai ô mật khẩu, show/hide giữ che mặt, mismatch không gửi API, API lỗi giữ draft và retry qua response xác nhận email giả lập.
- 320/768/1440px: document không tràn ngang. Không có page error trong các kịch bản đã chạy.
- Model tải thất bại vẫn có form/fallback; reduced motion vẫn có phản ứng mật khẩu tĩnh.

Kết quả và ảnh: `output/verification/auth-character/results.json`, `desktop-password.png`, `mobile-320.png`. `realtime-preview.gif` được ghép từ 36 ảnh chụp liên tiếp của trang thật tại máy, có thể xem chuyển động; không phải video production. Chưa kiểm chứng tạo tài khoản hoặc OAuth trên production trong lần thay đổi này.
