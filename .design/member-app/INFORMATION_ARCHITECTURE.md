# Information Architecture: Homeji (app thành viên)

Phạm vi: giao diện sau đăng nhập của `exe-homeji-web` (không gồm landing khách `src/features/landing-hx`, không gồm `/admin`).
Giả định đã chốt với chủ dự án: người thuê là người dùng chính; việc số 1 là **tìm phòng**; độ sâu điều hướng tối đa 2 cấp; nơi dùng 80% thời gian là **Tìm phòng (danh sách/bản đồ)**.

## Site Map

- Trang chủ thành viên `/`
- Tìm phòng `/?section=listings` (`view=list|split|map`, `catalog=rooms|apartments|market`)
  - Chi tiết tin (lớp phủ) `/?post=<id>`; bản công khai cho SEO `/rentals/<id>`
- Ở ghép `/?section=invitations` (tab người, phòng, lời mời)
- Chợ Homeji `/?section=marketplace` (`market=food|goods|orders|wallet`)
- Tin nhắn `/?section=messages` (`conversation=<id>`)
- Đăng tin `/posts/new?type=vacant|roommate|pass`, sửa `/posts/<id>/edit`
- Của tôi (menu tài khoản)
  - Quản lý tin `/?section=myPosts`
  - Tin đã lưu và đang cân nhắc `/?section=saved`
  - Lịch xem phòng `/?section=appointments`
  - Tin tìm phòng `/?section=wanted`
  - Hồ sơ `/?section=profile`, Gói Premium `/?section=payments`, Hoá đơn `/receipts`, Mời bạn `/referrals`
- Thông báo: popup từ chuông (`?section=notifications` chỉ mở popup)
- Pháp lý: `/privacy`, `/terms`

## Navigation Model

- **Điều hướng chính (desktop header):** logo, 3 trụ cột (Tìm phòng · Ở ghép · Chợ Homeji), ô tìm kiếm. Tối đa 3 mục.
- **Hành động chính:** đúng **một** nút tô màu cam là "Đăng tin". Mọi nút khác trên header là nút trung tính hoặc chỉ có biểu tượng.
- **Tiện ích (bên phải):** Trợ lý AI (nút viền, trung tính), Tin nhắn, Thông báo, Avatar. Đổi giao diện sáng/tối, Đơn bán và các mục "Của tôi" nằm trong menu avatar.
- **"Danh mục":** mega menu là lối vào phụ cho mọi tính năng. Không lặp lại trụ cột.
- **Mobile:** thanh tab dưới 5 mục (Trang chủ · Tìm phòng · Đăng tin · Ở ghép · Tin nhắn). Header mobile chỉ còn logo, chuông, avatar. Ô tìm kiếm nằm ngay đầu trang chủ.
- Nút nổi "Phòng mới" (theo dõi nhu cầu) không được che nội dung. Trên mobile, nút nằm trên thanh tab, ẩn khi cuộn xuống và hiện lại khi cuộn lên.

## Content Hierarchy

### Trang chủ thành viên
1. Lời chào và **ô tìm kiếm**: việc số 1, phải thấy ngay trên mobile.
2. **Lối vào nhanh**: Phòng trọ · Căn hộ · Ở ghép · Chợ đồ. Bốn đích đến chính, một chạm.
3. Việc đang dở (chỉ hiện khi có): lịch xem phòng sắp tới, tin nhắn chưa đọc, tin mới khớp nhu cầu.
4. **Phòng đang mở** (lưới thẻ) với nút "Xem tất cả".
5. Cột phụ: Chợ Homeji, ở ghép gợi ý. **Ưu đãi/voucher để cuối cột**, không chiếm màn đầu.

### Tìm phòng (danh sách)
1. Thanh lọc: loại (Phòng trọ, Căn hộ, Chợ), Lọc, Sắp xếp, Kiểu xem.
2. Chip lọc nhanh: một hàng, cuộn ngang.
3. Lưới thẻ phòng.
4. Tải thêm hoặc "Trang sau" khi còn trang.

### Thẻ phòng (mọi nơi)
1. Ảnh (badge tối đa 1: Nổi bật hoặc Đã xác minh) và nút lưu.
2. **Giá/tháng**: thông tin quyết định đầu tiên.
3. Tiêu đề (2 dòng).
4. Khu vực (1 dòng) · diện tích · loại.
5. Tối đa **3 nhãn** ưu tiên: khớp ngân sách/trường, tiện ích nổi bật. Phần còn lại xem trong chi tiết.
6. Một hành động phụ ("Xem trên bản đồ"). Hành động chính là bấm vào thẻ.

## User Flows

### Tìm và liên hệ phòng
1. Trang chủ, gõ vào ô tìm kiếm hoặc chọn lối vào nhanh.
2. Tìm phòng (danh sách), lọc hoặc sắp xếp, bấm thẻ.
3. Chi tiết (`?post=`). Từ đây: Lưu, Thêm vào cân nhắc, Nhắn tin, Đặt lịch xem.
   - Chưa đủ hồ sơ: chuyển tới cập nhật hồ sơ, xong thì quay lại tin.
   - Tin đã gỡ: báo lỗi, quay về danh sách.
4. Tin nhắn hoặc Lịch xem phòng, nhận xác nhận của chủ tin.

### Đăng tin (chủ nhà hoặc người tìm bạn ghép)
1. Bấm "Đăng tin" (header hoặc tab giữa).
2. Chọn loại (phòng trống, ở ghép, nhượng phòng), điền form, đăng.
3. Vào Quản lý tin, theo dõi lượt xem, liên hệ, lịch hẹn.

## Naming Conventions

| Khái niệm | Nhãn UI | Ghi chú |
|---|---|---|
| Danh sách tin cho thuê | Tìm phòng | Không dùng "Khám phá" ở điều hướng |
| Tạo tin | Đăng tin | Không dùng "Phòng mới" cho nút tạo |
| Tin người dùng đã lưu | Tin đã lưu | |
| Danh sách so sánh | Đang cân nhắc | |
| Theo dõi nhu cầu (tin mới khớp) | Phòng mới phù hợp | Nút nổi rút gọn: "Phòng mới" |
| Trợ lý hội thoại | Trợ lý AI | |
| Tìm bằng câu mô tả | Tìm bằng AI | |
| Chợ đồ, đồ ăn | Chợ Homeji | |

## Component Reuse Map

| Component | Dùng ở | Khác biệt |
|---|---|---|
| GlobalHeader (AppShell) | mọi màn thành viên | compact khi cuộn |
| MobileTabBar | mọi màn mobile trừ đăng nhập | |
| PageFrame | các màn tính năng | không còn eyebrow |
| RentalPostCard / MapListingCard | trang chủ, tìm phòng, đã lưu | cùng thứ tự thông tin |
| useDialogFocus | AuthModal, dialog chợ | |

## Content Growth Plan

- Tin phòng: phân trang 20/tin, cuộn vô hạn dừng ở trang cuối. Sitemap phân trang `/sitemaps/rentals-N.xml`.
- Tin nhắn, thông báo, hoạt động: danh sách theo thời gian, tải thêm.

## URL Strategy

- App thành viên dùng `/` + `?section=` (giữ nguyên, đã có redirect từ đường dẫn cũ `/saved`, `/profile`…).
- Mỗi tin có URL công khai `/rentals/<uuid>` cho SEO (server render, canonical, sitemap). `?post=<id>` chỉ dùng trong app.
- Bộ lọc nằm ở query và được lưu theo tab (`listingSearchState`). Thay đổi bộ lọc dùng `replace`, không thêm lịch sử.

## SEO (từ seo-audit)

- Đã có: `/rentals/<id>` server-render với title, description, canonical, og, `robots.txt`, sitemap index.
- Cần thêm:
  - `index.html`: meta description, og:title, og:description, og:image, og:url, twitter:card; `theme-color` theo bảng màu mới.
  - Trang `/rentals/<id>`: JSON-LD (`Accommodation` + `Offer` giá VND), og:image từ ảnh đại diện.
  - Sitemap tĩnh cho `/`, `/privacy`, `/terms`.
- Mỗi màn có đúng một `h1` (trang chủ: lời chào; màn tính năng: tiêu đề PageFrame).
