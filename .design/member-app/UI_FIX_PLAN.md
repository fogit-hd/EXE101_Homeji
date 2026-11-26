# Kế hoạch sửa giao diện thành viên (Homeji web)

Phạm vi: mọi màn hình sau đăng nhập (hub, Tìm phòng, Đã lưu, Tin nhắn, Chợ, Hồ sơ, Gói Premium, Ở ghép, Lịch xem phòng, Tin của tôi, Đăng tin, Mời bạn). Không đụng `src/features/landing-hx` và landing khách.
Chế độ: Operate (người dùng làm việc), nên ưu tiên dễ quét, nhất quán, đúng màu thương hiệu; không thêm trang trí.

Bằng chứng: quét tự động ở 375px và 1280px, sáng và tối, ngày 2026-11-24, cộng quét mã CSS.

## 1. Màu: chỗ đổi giao diện sáng/tối thì hỏng

| # | Vấn đề | Bằng chứng | Hướng sửa |
|---|---|---|---|
| C1 | Nút cam chữ trắng cứng. Ở giao diện tối nền cam sáng `#f97316` + chữ trắng chỉ đạt 2.8:1 | "Đăng bán" (Chợ) 2.80; nút "Tìm" header, "Tìm" hub, nút đăng tin. 223 chỗ `color: #fff` trong CSS | Mọi nút nền `--action-primary` dùng chữ `--action-on-primary` (token đã đúng: trắng ở sáng, nâu đậm ở tối). Thay `#fff` bằng token theo từng nhóm |
| C2 | Chữ gần như vô hình | Nhãn "Premium" ở danh sách Tin nhắn 1.08:1 (sáng); "Voucher" ở hub 1.32:1 (tối); nút "Xem lời mời" (hub) 2.84:1 | Sửa từng chỗ về token chữ/ nền đúng cặp |
| C3 | Còn màu của bảng màu cũ | teal `#087f8c` 24 chỗ / 15 file; xanh lá Grab `#00b14f` 45 chỗ / 18 file; đỏ cam `#e65c3a` 28 chỗ; xanh Google `#1a73e8` 22 chỗ, `--maps-blue` 157 chỗ (viền focus, link); khối Hồ sơ desktop nền teal đậm `#153f43` | Ánh xạ về 4 vai trò: thương hiệu `--grab-green` (xanh rêu), hành động `--action-primary` (cam), thông tin `--text-*`, trạng thái `--success/--warning/--danger`. `--maps-blue` chỉ giữ trong UI bản đồ Google |
| C4 | Gói Premium mỗi thẻ một màu (xanh lá, teal, xanh dương, vàng) | Trang Gói Premium desktop | Các thẻ dùng chung nền; chỉ gói được đề xuất có viền/nhãn cam |
| C5 | Giao diện tối là bản vá | `dark-theme.css` 56 màu cứng ghi đè; nhiều component đặt màu tối riêng | Sau C1–C3, xoá dần các ghi đè trùng token (từng file, chạy lại kiểm tra tương phản) |

## 2. Component quá to, chiếm chỗ

| # | Component | Kích thước đo được | Hướng sửa |
|---|---|---|---|
| S1 | Thẻ phòng ở Tìm phòng (mobile) | 331×553 và 331×698px: một thẻ gần đầy màn hình | Thẻ mobile dạng ngang hoặc ảnh 4:3 thấp hơn; tối đa 3 nhãn; ẩn "Thêm vào cân nhắc" vào nút icon. Mục tiêu ≤ 360px |
| S2 | Thẻ gói Premium (mobile) | 335×586 và 335×645px, 4 thẻ xếp chồng ≈ 2.400px | Mobile: danh sách gọn (tên, giá, 3 quyền lợi, nút); "Xem chi tiết" mở rộng. So sánh đầy đủ chỉ ở desktop |
| S3 | Form "Hồ sơ tìm bạn" đầu trang Ở ghép | 343×586 (mobile), 1112×421 (desktop): form đứng trước kết quả | Kết quả lên trước; hồ sơ thu thành 1 dòng tóm tắt + nút "Sửa" mở sheet |
| S4 | Khối Hồ sơ | Thẻ thông tin 303×535 (mobile); khối liên hệ Premium 1044×401 (desktop) | Dạng danh sách nhãn–giá trị 2 cột ở desktop, 1 cột gọn ở mobile; sửa mở sheet |
| S5 | Thẻ Đã lưu và cửa hàng Chợ | 343×412 và 343×385px | Ảnh thấp hơn, gộp hàng hành động |
| S6 | Khối Chợ trên hub | 343×372px giữa trang chủ | Rút còn 1 hàng cuộn ngang 4 món |
| S7 | Tin nhắn có footer trang web bên trong | `.site-footer` hiện trong khung chat, link cao 17px | Bỏ footer khỏi màn hình làm việc (chat, bản đồ) |

## 3. Nhất quán hệ thống (normalize)

| # | Vấn đề | Đo được | Hướng sửa |
|---|---|---|---|
| N1 | Cỡ chữ vụn | 126 giá trị font-size khác nhau; mỗi trang 7–13 cỡ (11.2, 12.8, 13.33, 13.5, 14.4px…) | Thang 6 bậc: 12 / 13 / 14 / 16 / 20 / 26 (+ 32 cho số tiền lớn). Token `--fs-*` |
| N2 | Bo góc | 46 giá trị border-radius | 4 bậc: 8 (ô nhập, chip), 12 (thẻ nhỏ), 16 (thẻ), 999 (pill) |
| N3 | Bóng đổ | 257 box-shadow khác nhau | 3 bậc: không bóng (nội dung), `--shadow-pop` (menu, popover), `--shadow-sheet` (sheet, dialog) |
| N4 | Tiêu đề trang | Mỗi trang một kiểu: Lịch xem phòng 36px, Hồ sơ trong khối màu, Chợ "Đồ cũ quanh bạn" | Một component tiêu đề trang: h1 26px mobile / 32px desktop, mô tả 1 dòng, hành động bên phải |
| N5 | Nút | Nút kính vát cạnh, nút pill, nút vuông 6px cùng tồn tại | 3 kiểu: chính (cam đặc), phụ (viền), chữ. Cao 44px mobile / 40px desktop |
| N6 | Chip/segmented | Tab Chợ, tab Tìm phòng, tab Ở ghép mỗi nơi một kiểu | Một kiểu segmented + một kiểu chip lọc |
| N7 | Màu cứng | index.css 200, PaymentPage 187, MapMessagesPanel 124, PremiumLaunchOffer 111, AuthPage 101… | Theo thứ tự file nhiều nhất, thay bằng token |

## 4. Chữ trên giao diện (clarify)

Cần anh/chị duyệt trước vì là thay đổi nội dung:

- Tiêu đề trùng ý hoặc dài: "Lịch xem phòng của {tên}" → "Lịch xem phòng"; "Những nơi đáng để quay lại" (Đã lưu) → "Phòng đã lưu"; "Đồ cũ quanh bạn" so với tab "Chợ Homeji".
- Nhãn hành động thiếu đối tượng: "Tìm" → "Tìm phòng" (nơi đủ chỗ); "Làm mới" (Gói Premium) không rõ làm mới gì.
- Trạng thái mơ hồ: nhãn "Nổi bật" và "Chủ nhà đã xác minh" cùng mức nổi; "Chung" trong Nhật ký hoạt động.
- Danh sách đầy đủ sẽ lập khi chạy `clarify`.

## 5. Thứ tự làm

1. C1, C2 (tương phản, dễ thấy nhất, ít rủi ro).
2. N1–N3 thành token trong `index.css`; N5, N4 thành component dùng chung.
3. C3, C4, N7: thay màu cũ theo file (Codex làm phần cơ học, tôi duyệt).
4. S1–S7: bố cục mobile/desktop riêng từng màn hình (tôi tự làm).
5. C5: dọn ghi đè giao diện tối.
6. Clarify: chữ, sau khi anh/chị duyệt danh sách.

Sau mỗi bước: quét tương phản tự động 375/1280 sáng/tối, chụp màn hình, tsc, lint, build, test.

## Ghi chú

- `PRODUCT.md` còn ghi màu thương hiệu teal `#087f8c` và xanh `#136fd8`, đã cũ so với bảng màu hiện tại. Chỉ báo, chưa sửa.
- Máy quét không đo được chữ trên ảnh, gradient và kính mờ; các chỗ đó kiểm bằng ảnh chụp.

## 6. Danh sách sửa chữ (chờ duyệt)

| # | Chỗ | Hiện tại | Đề xuất | Lý do |
|---|---|---|---|---|
| T1 | Tiêu đề Lịch xem phòng (`MapAppointmentsPanel.tsx:372`) | Lịch xem phòng của {tên} | Lịch xem phòng | Tên đã có ở header; tiêu đề dài, xuống 2 dòng trên mobile |
| T2 | Tiêu đề Đã lưu (`FeatureWorkspace.tsx:18`) | Những nơi đáng để quay lại | Phòng đã lưu | Khớp nhãn tab "Đã lưu"; người dùng quét tìm đúng tên mục |
| T3 | Tiêu đề Gói (`FeatureWorkspace.tsx:23`, `MapAppPanel.tsx:45`) | Gói Đăng ký | Gói Premium | Menu, trang và hồ sơ đều gọi "Gói Premium" |
| T4 | Nút tìm trên hub (`AuthenticatedHub.tsx:243`) | Tìm | Tìm phòng | Đủ chỗ; nói rõ tìm gì |
| T5 | Gói Premium (`PaymentPage.tsx:376`) | Làm mới | Cập nhật số dư | Nút nằm cạnh số dư ví; "Làm mới" không rõ làm mới gì |
| T6 | Biên nhận (`ReceiptsPage.tsx:76`) | Làm mới | Tải lại danh sách | Cùng lý do |
| T7 | Tìm phòng bằng AI (`NaturalRentalSearch.tsx:101`) | Làm mới | Hỏi lại từ đầu | Nút xoá cuộc hỏi, không phải tải lại |
| T8 | Nhật ký hoạt động (`labels.ts:197`) | Chung | Khác | "Chung" không nói loại hoạt động nào |

Giữ nguyên: "Đồ cũ quanh bạn" (đã có eyebrow "Chợ Homeji" phía trên), nhãn "Nổi bật" (title đã giải thích không phải xác minh; phần mức nổi xử lý bằng màu ở bước C).
Đã thêm (cần biết): nút "Xem thêm {n} quyền lợi" trên thẻ gói ở mobile.
