# Menu chia nhóm và kính dễ đọc — 19/10/2026

## Quyết định giao diện

Yêu cầu dựa trên năm ảnh lỗi và đường dẫn `/?section=marketplace&market=food`.
Khúc xạ phủ lên các hàng menu, nút và vùng bấm thẻ gây bóng đôi, méo chữ và viền màu.
Kiểm thử trình duyệt trước sửa đã bắt được nút có cả bộ lọc SVG và pseudo-face.

- Danh mục dùng dropdown chia nhóm Nhà ở, Cộng đồng, Chợ Homeji và Tài khoản; từng nhóm có thể bung/thu trên desktop lẫn mobile. Các nhóm mua sắm và quản lý cửa hàng giữ URL hiện có.
- Menu tài khoản có tiêu đề nhóm Ví & thanh toán, Tài khoản & dịch vụ, Hoạt động của bạn. Số dư, retry, kiểm tra chủ ví và điều hướng không đổi.
- Chữ tab nằm trên bề mặt chọn. Bỏ pseudo-face tự động và RGB dispersion; kính nền dùng blur, tint và viền nhẹ. SVG chỉ còn dành cho bề mặt trang trí chọn tham gia bằng `data-glass-optics`.
- Marketplace/food có bề mặt kính ở header, vị trí, bếp và giỏ hàng; ảnh và nội dung thẻ giữ rõ. Bộ lọc mobile có hai cột, khoảng cách tab gọn hơn.
- Sửa nền/chữ các khối món nổi bật, nguồn quán ăn, ghi chú giỏ hàng trong dark mode. Nút nổi không che menu danh mục. Menu tài khoản không tràn ở 320px.

Đánh đổi: giảm hiệu ứng quang học để đọc thông tin và thao tác chính xác hơn; giữ cảm giác kính qua chiều sâu và nền bán trong suốt. Không thêm thư viện UI hoặc đổi API/nghiệp vụ.

## Nguồn hướng dẫn

Đã đọc và chạy tìm kiếm của [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) với `keyboard navigation dropdown --domain ux` và `glassmorphism readability --domain style`. Kết quả phù hợp với điều hướng web, focus bàn phím và điều kiện tương phản của kính. Áp dụng vào React/Vite và CSS hiện hữu, không thay stack.

Tài liệu này thay thế chỉ dẫn cũ về khúc xạ chữ/RGB trong `liquid-glass-optics.md` và `liquid-glass-choice-system.md`. Các E2E lịch sử yêu cầu chữ nằm dưới lens không còn là tiêu chí thiết kế hiện tại.

## Bằng chứng kiểm tra

- `npm run build`: qua TypeScript/Vite.
- ESLint các component TSX đã sửa: qua. Không tuyên bố toàn repo sạch lint.
- `node --test tests/*.test.mjs`: 279/279 qua.
- `tests/glass-readability.e2e.mjs`: trước sửa thất bại vì optical overlay; sau sửa qua.
- `tests/grouped-menu-readability.e2e.mjs`: qua trên dev và bản build production local. Kiểm tra light/dark ở 320/390/1024/1440px, không tràn ngang, chữ trên lens, nền kính food, tương phản hai tiêu đề >= 4.5:1, nhóm menu, ArrowDown/Home/End/Escape, focus trả về trigger, nút nổi không che menu, tab Đồ ăn/Chợ đồ đổi đúng URL.
- `tests/account-wallet-menu.e2e.mjs`: qua tải lại số dư, phản hồi đến muộn, error/retry/zero, sai chủ ví, mobile 320px và điều hướng ví.
- `tests/liquid-glass-context.e2e.mjs`: qua hồ sơ/thanh toán/marketplace light/dark desktop/mobile.

Ảnh và JSON: `output/verification/grouped-menu/`; kiểm thử quang học: `output/verification/glass-readability/`.

Các kiểm thử dùng Chrome và API fixture local. Đã xem ảnh desktop/mobile, light/dark và menu. Không xác minh mọi trình duyệt hoặc mọi màn hình/role. Kiểm tra live không đăng nhập tại homeji.onrender.com trả về landing khách; chưa xác minh màn hình tài khoản live, chưa deploy thay đổi trong lần này.


## Ghép lên nhánh production

Bản phát hành dựa trên `cd35ef0` của `origin/main`, giữ nút Homeji AI, liên kết Quản lý tin/Tin đã lưu, menu món theo bếp, skeleton và cách tải ví độc lập. Chỉ ghép thay đổi menu/kính; không thay toàn bộ thư mục đang làm việc.

Build và ESLint phần sửa qua. Bộ test trên nhánh phát hành: 274/277 qua; ba lỗi cũng tái hiện trên bản `origin/main` chưa sửa: adapter test admin thiếu AdminAnalyticsSkeleton, test màu hub cũ, test màu thông báo cũ không còn khớp selector. Không tính ba lỗi này là hồi quy của bản sửa. Kiểm tra Chrome trên production build local qua hai theme và 4 kích thước, menu bàn phím và chuyển tab đồ ăn/chợ đồ; không có pageerror. Ảnh trong worktree phát hành là bằng chứng của chính mã được deploy.


## Xác minh sau deploy

Commit UI `bebae40428d95017a378c4ead35b91aeea7ae318` đã push lên main và phát hành tại **https://homeji.onrender.com**. Kiểm tra lúc 10:40 ngày 19/10/2026 (Asia/Saigon): HTTP 200, CSS `/assets/main-DNBfbkhz.css`, JavaScript `/assets/main-DUHkXBFs.js`. CSS có nhóm menu mới; bundle JavaScript có nhóm tài khoản và logic focus mới, không còn cơ chế tự gắn optical face.

Đã chạy lại kiểm tra trình duyệt trên bundle live: menu phân nhóm, focus bàn phím, đóng/mở, tab Đồ ăn/Chợ đồ, light/dark ở 320/390/1024/1440px; không tràn ngang hoặc pageerror. Đã xem ảnh menu tài khoản và đồ ăn mobile từ host live. API trong kiểm tra này được giả lập, mọi traffic ngoài host bị chặn; không đăng nhập tài khoản thật, tạo đơn hoặc thực hiện thanh toán. Đây là bằng chứng UI đã phát hành, không phải bằng chứng nghiệp vụ backend production.

Kết quả/ảnh live trong worktree phát hành: `output/deploy-readable-glass/release.json` và `output/deploy-readable-glass/live-ui-fixtures/`.


## Điều chỉnh theo phản hồi trực tiếp

Người dùng yêu cầu menu Danh mục dễ nhìn như trước sau khi xem bản accordion. Trả riêng Danh mục về mega menu bốn cột trên desktop và cách nhóm mobile ban đầu; giữ sửa kính/độ rõ của chữ và menu tài khoản. Kiểm tra mới xác nhận bốn cột desktop, bàn phím và light/dark/mobile. Bộ lọc inline giữ bố cục production, không áp CSS grid của thanh lọc cũ.
