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
