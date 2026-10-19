# Kiểm chứng phát hành công nghệ Homeji

Kiểm tra HTTP ngày 19/10/2026, khoảng 10:26 giờ Việt Nam.

## Mã đã phát hành

- Backend `6284846`: normalized PostgreSQL search, generated columns/trigram indexes và public rental catalog. Đã đẩy `thanhduykx/Homeji_BE` main.
- Frontend `af09e94`: GA4 consent, semantic events, account-scoped saved Query cache và public rental HTML. Đã đẩy `fogit-hd/EXE101_Homeji` main, giữ các thay đổi mới trên main.
- Release checkout backend: 463 unit + 202 API/integration + 5 persistence pass, không skip. Frontend build pass; 30 targeted tests pass; hai Chrome fixture flows pass. Full frontend: 273 pass, 3 fail; cả ba lỗi admin skeleton/palette/notification contrast cũng tái hiện trên baseline không chứa thay đổi này. Không gọi đây là full suite xanh.

## Domain chính đã xác minh qua HTTP

`https://homeji.onrender.com`:

- Homepage có meta xác minh Search Console chính thức.
- `/rentals/1dbb755c-a098-430b-ab08-0878de1419f0` trả HTML 200, có h1 và canonical đúng origin.
- `/sitemap.xml` và `/sitemaps/rentals-1.xml` trả XML và URL đúng domain.
- UUID không tồn tại trả 404/noindex.
- Public API backend trả 8 tin công khai. Đây là bằng chứng endpoint production; chưa có truy vấn trực tiếp để kết luận query plan production.

JSON/HTML cục bộ tại `output/technology-rollout/production-http-verification.json`, `production-ga4-bundles.json`, `production-public-rental.html` trong release checkout.

## GA4 còn thiếu cấu hình ở đúng dịch vụ

Google đã tạo stream Homeji Production Web, Measurement ID `G-VKPWYMZY40`, stream ID `16155915378`; Enhanced Measurement OFF. Người dùng xác nhận quy mô 1–10 và chấp nhận điều khoản.

Domain chính tải `/assets/main-CcaAWMNp.js`; shared analytics chunk `/assets/ga4-BSlEXx-C.js` có ID rỗng và readiness false. Do đó tag bị chặn đúng thiết kế; chưa có collection production ở domain này.

Dịch vụ Render thấy trong phiên hiện tại là `srv-db9ouq61egvs738388bg`, URL `homeji-zbw6.onrender.com`, không phải domain chính. Bundle analytics tại domain phụ này có Measurement ID thật. Không dùng kết quả này làm bằng chứng domain chính đã bật GA4; không sửa canonical sang domain phụ chỉ để vượt kiểm tra.

Cần đặt trên dịch vụ thực sự phục vụ `homeji.onrender.com`, rồi rebuild:

```dotenv
VITE_GA4_MEASUREMENT_ID=G-VKPWYMZY40
VITE_GA4_MANUAL_PAGEVIEWS_READY=true
VITE_GA4_DEBUG=false
PUBLIC_SITE_URL=https://homeji.onrender.com
```

Sau đó kiểm tra consent trước/sau, không trùng pageview và Realtime/DebugView. Search Console vẫn cần nhấn Verify, gửi sitemap và kiểm tra URL Inspection. Quyền điều khiển trình duyệt bị tắt trong Work settings ở lượt kiểm tra này nên chưa thao tác được Google/Render. Đã hỏi dashboard URL của dịch vụ domain chính; không cần gửi mật khẩu hoặc API secret.

## Cập nhật kiểm chứng thực tế sau khi người dùng sửa cấu hình

Ngày 19/10/2026, bundle domain chính đã có `G-VKPWYMZY40`, readiness true. Trong trình duyệt tích hợp, trước consent không có tag; sau khi bấm Đồng ý thống kê, gtag.js trả 200 và hai request `page_view`, `rental_view` tới `www.google-analytics.com/g/collect` đều trả 204. Page location gửi là `https://homeji.onrender.com/analytics/rental-public`, không chứa ID tin hoặc query người dùng. Đây là sự kiện qua giao diện thật, không gọi Measurement Protocol hoặc bơm purchase giả.

Google Analytics property Homeji Web / `559520332`: Realtime hiển thị 3 active users, 5 page_view và 1 rental_view; có màn hình `Homeji | rental-public` với 1 lượt xem. Các số này chỉ là snapshot kiểm thử, không đại diện tăng trưởng hoặc conversion. Rút consent gỡ tag; reload sau từ chối không quan sát request Google Analytics/Tag Manager. Không suy luận xóa lịch sử trên Google từ việc rút consent.

Search Console đã tự động xác minh quyền sở hữu URL-prefix bằng Thẻ HTML. Đã gửi `/sitemap.xml` và `/sitemaps/rentals-1.xml`; sau xử lý cả hai hiển thị Thành công, sitemap con khám phá 8 trang. Trạng thái ban đầu Không thể tìm nạp đã chuyển Thành công, không cần sửa XML. URL Inspection nhận diện tin mẫu qua cả hai sitemap nhưng chưa lập chỉ mục; đang kiểm tra bản live để phân biệt khả năng crawl với quyết định đưa vào chỉ mục của Google.

Bằng chứng được lưu ngoài Git tại `C:/EXE101_Homeji/output/technology-rollout/`: `ga4-production-browser-proof.json` (chỉ trường đã lọc, không cookie/client ID), `ga4-realtime-production.png`, `ga4-realtime-events-production.png`, `search-console-ownership-verified.png`, `search-console-sitemap-success.png`.

Giới hạn vẫn giữ nguyên: đơn hàng/hoàn tiền đối soát bằng DB; chưa bổ sung backend Measurement Protocol/refund producer; không tạo giao dịch khách thật để thử analytics. Hiệu năng index đã đo trên mẫu 30.000 dòng cục bộ và kiểm tra recall trong test; không công bố tỷ lệ tăng tốc production. Full frontend vẫn có 3 lỗi baseline ngoài thay đổi, đã ghi ở phần kiểm thử.

Kết quả URL live lúc 16:30 ngày 19/10/2026 (giờ Việt Nam) từ Search Console: **Google có thể lập chỉ mục URL này / Trang có thể lập chỉ mục**. Đây là xác minh khả năng Google truy cập và đánh giá trang đang hoạt động; trạng thái indexed thực tế vẫn chưa có. Không cam kết thời gian hoặc vị trí xuất hiện trong tìm kiếm. Ảnh: `search-console-live-url-indexable.png` trong thư mục bằng chứng trên.

## Đối chiếu mục tiêu

- PostgreSQL: migration/generated columns/GIN và predicates trước pagination đã phát hành; kiểm thử trên DB thật cục bộ chứng minh chuẩn hóa tiếng Việt, wildcard literal, cập nhật SQL, recall/ranking và planner chọn trigram mà không ép. Endpoint public production đọc được mô hình sau migration.
- Query pilot: phòng đã lưu có query key/client theo tài khoản, cancellation, invalidation, retry giới hạn; Chrome fixture kiểm chứng logout/login không lẫn dữ liệu, 403 che cache. Không dùng Query để xác nhận thanh toán.
- SEO: HTML public có nội dung không cần JS, canonical theo domain chính, sitemap/robots và 404/noindex đã kiểm chứng production; ownership, sitemap discovery và Google live URL test đã xác minh.
- GA4: config production đúng mã và manual gate; basic consent/rút consent quan sát qua browser network; Google Realtime thực sự có page_view/rental_view. Payload màn hình tổng hợp và tests giới hạn tham số; các purchase chỉ gắn vào phản hồi API đã xác nhận, không top-up/success URL. Không bổ sung server Measurement Protocol vì mục tiêu chỉ đặt làm hướng mở rộng về sau.
