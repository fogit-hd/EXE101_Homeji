# Dropdown và nút kính lỏng

Ngày kiểm tra: 18/10/2026. Bản triển khai được ghép riêng trên origin/main tại commit nền 6b4b441, giữ các cập nhật đăng ký/khôi phục mật khẩu và bộ lọc mới trên production.

## Phạm vi và phương án

Đã rà soát mã nguồn các select, listbox, menu và autocomplete. Có 31 vị trí JSX dùng native select trong 16 file; hai bộ lọc tự dựng ở MapExplore nâng tổng số vị trí dùng `ChoicePicker` lên 33 trong 17 file. Một vị trí JSX có thể render nhiều lần, ví dụ chọn đơn vị điện/nước. Danh sách nằm ở `output/verification/liquid-glass/choice-inventory.json`.

Thay menu select bằng bảng lựa chọn: có tìm tiếng Việt không dấu, nhóm lựa chọn, trạng thái đã chọn và duyệt bằng bàn phím. Desktop mở cạnh trường, tự chuyển lên trên khi thiếu chỗ; mobile dùng bảng từ đáy màn hình và theo visual viewport khi bàn phím thay đổi kích thước. Panel portal ra body để không bị cắt bởi container của bản đồ/lịch.

Native select chỉ còn bên trong component, phục vụ FormData, required, reset và phát sự kiện change thật. Các handler chuyển enum/số, bộ lọc API, URL và quy tắc nghiệp vụ hiện hữu được giữ lại. Component hiện dành cho chọn một mục; không dùng cho multi-select.

Autocomplete địa chỉ và bản đồ giữ cách nhập và nguồn gợi ý riêng. Bổ sung active descendant, ArrowUp/Down, Escape, Enter chọn gợi ý và ngăn focus vào nội dung đã đóng. Enter chưa chọn gợi ý vẫn chạy tìm kiếm cũ. Menu tài khoản hỗ trợ mở bằng phím mũi tên, Home/End và trả focus khi Escape; menu quản lý tin không còn chặn Enter/Space của tất cả phần tử con để chạy cùng một hành động.

## Vật liệu và giới hạn

`src/liquid-glass.css` áp dụng nền bán trong suốt, viền sáng, blur và highlight cho nút hành động và popup ở cả light/dark. Không áp vật liệu lên ảnh, vùng bấm thẻ, ngày lịch, option, tab và control do Google Maps quản lý. Các mục danh sách dùng nền nhẹ thay vì mỗi hàng có một backdrop riêng.

Không giảm độ đục đồng loạt: nền hỗn hợp làm chữ khó đọc. Nút có độ trong cao hơn, panel danh sách giữ nền đậm hơn. Bộ lọc SVG `homeji-liquid-lens` tạo biến dạng nền cục bộ khi hover/focus trên các nút chính/submit và trigger picker. Highlight theo chuột dùng tối đa một requestAnimationFrame cho mỗi sự kiện, không có vòng animation chạy liên tục. Không transform/filter tổ tiên của map hoặc fixed panel.

SVG backdrop là progressive enhancement; các trình duyệt không hỗ trợ giữ blur/viền/nền kính. Hệ thống có fallback khi không hỗ trợ backdrop-filter, giảm transparency, tăng contrast, forced colors và reduced motion. Mức khúc xạ có thể khác nhau giữa engine; chưa xác minh trực quan trên Safari/Firefox hay điện thoại thật. Tham chiếu: [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter), [WAI-ARIA combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

## Xác minh

- `npm run build`: qua TypeScript và Vite production build.
- `node --test tests/*.test.mjs`: 232/232 qua; các adapter dựng component trong test cũ đã cập nhật để nhận ChoicePicker. Test SSR dùng component thật.
- ESLint các component mới, motion, menu và autocomplete đã sửa: qua.
- Lint rộng hơn trên 17 file tích hợp còn 9 lỗi ở logic effect/export hiện hữu, ngoài phần đổi picker. Không coi toàn dự án đã sạch lint; chi tiết ở `migrated-lint.txt` và đối chiếu bỏ riêng thay đổi picker ở `lint-comparison.json`.
- `tests/choice-picker.e2e.mjs`: required, FormData, một change event, tìm không dấu, disabled/group, reset, focus, Escape/Tab, calendar lồng nhau, portal ngoài container clipping, click ngoài đóng, SVG filter khi hover, reduced motion/forced colors. Khung 1440×1000, 320×740, 390×844 dark và 768×560 đều không tràn ngang.
- `tests/liquid-glass-app.e2e.mjs`: trang hồ sơ, tài khoản/số dư, hoạt động, lịch sử thanh toán, chợ đồ mobile; thay đổi trạng thái form và query API giữ đúng; menu tài khoản duyệt bằng bàn phím. Không có pageerror.
- `tests/dropdown-navigation.e2e.mjs`: chọn gợi ý trường học bằng bàn phím, tìm từ khóa bằng Enter, đóng/inert và Escape khi địa chỉ không có kết nối Google. Không có pageerror.
- `tests/payment-flow.e2e.mjs`: qua lịch sử/lọc/mobile, reload, URL trả về, polling thành công, hết hạn/hủy, checkout MoMo/PayOS giả lập, lỗi/thử lại/thiếu đơn.

Các E2E chạy Chrome local và API fixture, không tạo giao dịch thật. Chưa kiểm thử thủ công mọi trang với mọi vai trò, screen reader hoặc luồng Google Places production. Kết quả và ảnh trong `output/verification/liquid-glass/`; ảnh trang thật dùng dữ liệu giả lập. Các kiểm tra này xác minh giao diện và tương thích nghiệp vụ frontend, không xác nhận trạng thái production.

Chạy lại với Vite ở cổng 5493 và module Playwright đã cài, đặt `HOMEJI_PLAYWRIGHT_MODULE` cho ba script mới. Script payment dùng dynamic import nên nhận đường dẫn dạng file URL; đặt thêm `HOMEJI_TEST_BASE_URL=http://127.0.0.1:5493`.

## Kiểm tra bản release

Bản workspace ban đầu có 33 vị trí trong 17 file. Bản release ghép với production có 29 vị trí ChoicePicker trong 18 file (27 native select và hai menu MapExplore): bộ lọc chợ đồ đã được production chuyển thành MarketplaceFilterPanel, nên giữ nguyên giao diện đó; bổ sung picker chế độ xem tin trên bản đồ. Không chép đè các trang hay stylesheet từ checkout cũ. InteractionMotion giữ engine Motion và các hiệu ứng hiện hữu; chỉ ghép thêm highlight kính có cleanup và tuân thủ reduced-motion riêng.

Build production và ba E2E picker/app/navigation qua trên cổng 5497. Bộ unit test của nhánh release: 227/230 qua; ba lỗi ở admin SSR adapter, hub palette và notification contrast cũng tái hiện nguyên vẹn khi chạy test trên mã origin/main chưa sửa, lưu tại baseline-tests.txt. Không áp dụng con số 232/232 của workspace cũ cho bản release này.
