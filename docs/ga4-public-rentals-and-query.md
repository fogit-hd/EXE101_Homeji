# GA4, trang tin công khai và TanStack Query

Ngày triển khai cục bộ: 19/10/2026. Đã tạo property/stream GA4 trên Google; chưa xác minh collection production hoặc Search Console ownership.

Tiến độ Google: đã thêm URL-prefix `https://homeji.onrender.com/` vào luồng xác minh Search Console. Google cung cấp meta chính thức; meta này đã được thêm vào `index.html` và kiểm tra trong HTML build. Chưa deploy nên chưa Verify thành công. Đã tạo tài khoản Homeji, property Homeji Web, múi giờ Việt Nam, VND, ngành Bất động sản và quy mô 1–10 theo người dùng xác nhận. Người dùng đã xác nhận chấp nhận điều khoản tại thời điểm tạo. Các lựa chọn chia sẻ dữ liệu bổ sung đều tắt trong onboarding. Stream `Homeji Production Web`, ID `16155915378`, Measurement ID `G-VKPWYMZY40`; đã xác nhận switch Enhanced Measurement OFF trong chi tiết stream. Mã công khai và cờ manual pageviews đã ghi vào Render Blueprint, chưa áp dụng lên dịch vụ production. Chưa kiểm chứng retention/Signals trong trang quản trị hoặc sự kiện thực tế tại DebugView.

## Cấu hình GA4

- Build frontend với VITE_GA4_MEASUREMENT_ID bằng Measurement ID thật dạng G-… . Đây là mã công khai, không phải API secret.
- Trong web stream, tắt Page changes based on browser history events. Tắt các mục Enhanced Measurement chưa được duyệt (site search, form interaction, outbound click, file download, video/scroll nếu không cần). Homeji gửi page_view thủ công theo nhóm màn hình. send_page_view:false không tự tắt history tracking.
- Chỉ đặt VITE_GA4_MANUAL_PAGEVIEWS_READY=true sau khi đã kiểm tra setting trên. Thiếu một trong hai cấu hình thì GA4 không tải tag và không hiện lựa chọn Google.
- VITE_GA4_DEBUG=true chỉ dùng stream test/staging khi kiểm tra DebugView; production để false.
- Chọn retention phù hợp (đề xuất khởi đầu 2 tháng), tắt Google Signals và quảng cáo cá nhân hóa khi chưa có mục đích. Cấu hình loại trừ traffic nội bộ bằng cách thử nghiệm trước khi áp dụng filter vĩnh viễn. Không đánh dấu mọi page_view là key event; viewing_requested và purchase là các ứng viên cần chọn trong GA4.
- Basic consent: chưa chấp nhận thì không tải tag. Tôn trọng DNT/GPC, hỗ trợ đổi lựa chọn và rút lại. Rút lại ngừng event mới và xóa cookie GA truy cập được; không tự xóa lịch sử trên Google.

## Phạm vi dữ liệu

Page location là URL nhóm màn hình tổng hợp, không phải raw URL tài khoản. Không gửi email, tên, điện thoại, raw search/prompt/chat, tọa độ, OTP hay token. Chỉ giữ utm_source/medium/campaign là slug được duyệt; các campaign chứa ký tự ngoài allowlist sẽ bị bỏ. Không cấu hình attribution bằng cách gửi toàn bộ query string.

Sự kiện frontend: login, sign_up sau xác minh, rental_search (ai/filter), rental_view, rental_saved, viewing_requested; marketplace có view_item_list/add_to_cart/begin_checkout; Premium có begin_checkout. search_mode theo hành động tìm kiếm gần nhất trong trang, mang tính mô tả, không phải chứng minh quan hệ nhân quả.

Purchase Premium chỉ từ phản hồi API có status Completed, purpose PremiumSubscription và paidAt trong 30 phút gần nhất; query success không đủ. Giới hạn này tránh mở giao dịch cũ rồi gán doanh thu vào lượt truy cập hôm nay, đồng thời có thể bỏ sót khách quay lại muộn. Nạp ví không phát purchase. Marketplace chỉ phát sau API tạo đơn đã commit wallet debit; nhóm nhiều dòng theo CheckoutId, value là tổng tiền hàng/GMV, không phải doanh thu phí Homeji. Dedupe trong tab và transaction_id ổn định giúp giảm trùng; dữ liệu DB vẫn là nguồn đối soát.

Analytics trên browser có thể thiếu do đóng tab, chặn script hoặc từ chối. Chưa thêm Measurement Protocol, backend analytics outbox hay refund reporting; không có lời hứa mọi giao dịch/hoàn tiền đều xuất hiện ở GA4. Muốn đo doanh thu hoàn chỉnh cần kế hoạch server producer/client-session correlation và giữ consent, không chỉ thêm API secret.

## Tin công khai và Search Console

- Node production server phục vụ /rentals/{uuid} bằng HTML server-rendered cho mọi client, không phân biệt bot. Nội dung vẫn đọc được khi tắt JavaScript; phần JavaScript chỉ phục vụ thống kê tùy chọn.
- API /api/public/rentals/{uuid} chỉ lấy tin Active, không synthetic, chưa hết hạn chuyển nhượng; trả DTO riêng không có thông tin chủ tin riêng tư và không tăng view/activity. Tin chuyển nhượng dùng địa chỉ công khai đã làm mờ như tìm kiếm.
- Dữ liệu được đọc lại, không lưu HTML lâu; tin không công khai trả 404, lỗi provider/backend trả 503 và noindex thay vì giả nội dung còn tồn tại.
- Cấu hình PUBLIC_SITE_URL bằng origin HTTPS chính thức; không tạo canonical từ Host do client gửi. Sitemap tại /sitemap.xml, các phần /sitemaps/rentals-N.xml; robots.txt khai báo sitemap. Các trang public dùng title/description/canonical/OpenGraph, HTML-escape dữ liệu từ tin.
- GOOGLE_SITE_VERIFICATION chỉ chứa giá trị content của meta tag Google cung cấp, không dán toàn bộ HTML. Server chèn meta vào homepage và trang tin. Cần quyền tài khoản để nhấn Verify, gửi sitemap và kiểm tra URL Inspection trên domain thực tế; code không tự tạo quyền sở hữu.
- Bản đồ và luồng đặt lịch vẫn ở /?post=… . Nút chia sẻ tin dùng /rentals/{uuid}; vẫn hỗ trợ đường dẫn cũ /posts/{uuid} đi về map.
- Đây là server-rendered public document có phạm vi, không chuyển toàn bộ Vite SPA sang React Router Framework Mode hoặc Next.js. Giữ map và các panel tương tác hiện tại.

## TanStack Query thử ở phòng đã lưu

AccountQueryProvider tạo QueryClient mới theo account scope; cleanup hủy/xóa cache cũ. Query key có user ID, GET truyền AbortSignal, staleTime 30 giây, gcTime 2 phút. Retry tối đa một lần cho lỗi mạng/server; không retry lỗi 4xx. Không áp dụng cache này để xác nhận tiền hoặc số dư.

Save/unsave phát thông báo invalidation sau API thành công, kể cả khi thao tác từ bản đồ. SavedPostsPage cập nhật danh sách sau xác nhận server, không optimistic giả thành công và có loading/error/retry/empty. Các thao tác candidate/invitation vẫn giữ cơ chế hiện hữu.

## Kiểm chứng

Chạy npm run build, node --test tests/ga4.test.mjs tests/public-rentals.test.mjs, và kiểm thử browser trong tests/technology-rollout.e2e.mjs với Chromium/Chrome. Test GA4 dùng tag giả, không gửi Google thật. Cần xác minh thêm DebugView/property thực và Search Console sau khi có cấu hình/quyền tài khoản.
