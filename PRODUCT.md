# Product

<!-- impeccable:product-schema 1 -->

> **Phạm vi:** Đây là PRODUCT.md của **Homeji Web** (`exe-homeji-web`). Không mô tả app mobile (`exe-homeji-mobile`). Hai app dùng chung backend, không chia sẻ source.
>
> **Workspace:** Cursor thường mở root `EXE101/`. File này được hardlink tới `EXE101/PRODUCT.md` để `impeccable` đọc được khi cwd là parent folder.

## Platform

web

## Stack

React 19 + TypeScript + Vite 8 + react-router-dom 7 + plain CSS (CSS variables trong `src/index.css`). Không Next.js, không RSC, không Tailwind, không shadcn. Dev proxy `/api` và `/hubs` tới backend Homeji. Entry: `src/main.tsx` → `App.tsx` (BrowserRouter).

## Users

- **Người thuê / tìm phòng (primary):** sinh viên và người đi làm quanh Thủ Đức & Quận 9, cần tìm phòng trống, ở ghép hoặc pass phòng trên bản đồ.
- **Chủ nhà / người đăng tin:** đăng tin cho thuê, quản lý tin, nhận lời mời ở ghép / lịch hẹn.
- **Admin:** duyệt / kiểm duyệt nội dung (`/admin`).

## Product Purpose

Homeji là nền tảng tìm phòng trọ và bạn ở ghép an toàn. Slogan sản phẩm trên landing: **「Trọ an tâm · Nâng tầm cuộc sống」**. Thành công = người dùng tìm được phòng phù hợp nhanh, tin tưởng thông tin, và hoàn thành các tác vụ chính (xem bản đồ, lọc, chi tiết chỗ, nhắn tin/hẹn, thanh toán gói) trong shell map đã đăng nhập.

## Positioning

Map-first rental discovery cho khu vực Thủ Đức / Q.9: guest landing cinematic + bản đồ công khai; sau đăng nhập, hầu hết surface (marketplace, wanted, saved, profile, payments, notifications…) mở trong panel trên **home map** thay vì nhiều trang shell riêng. Brand accent xanh Grab (`--grab-green`) + chrome kiểu Google Maps (`--maps-blue`), UI tiếng Việt, tiền VND.

## Operating Context

- Guest: landing (`/`) với hero video, showcase, section bản đồ khu vực.
- Auth: `/login`, `/register`, quên/đặt lại mật khẩu; modal auth khi cần.
- Authed home map: Google Maps JS (Vector/WebGL), omnibox tìm kiếm, pin layers, place detail panel, chat/appointments panels, SignalR hubs.
- Form tạo/sửa tin: `/posts/new`, `/posts/:postId/edit`.
- Deep link cũ (`/marketplace`, `/profile`, …) redirect vào section trên map.
- Locale UI: tiếng Việt (`src/lib/labels.ts`, `apiMessagesVi.ts`); format giá/ngày `vi-VN`.

## Capabilities and Constraints

**Có:** tìm/lọc tin thuê, highlight AI, bản đồ + Places/Geocoding/Routes, marketplace đồ cũ, wanted posts, lời mời ở ghép, hoạt động, lưu tin, thông báo realtime, thanh toán/subscription, moderation admin, dark mode (`prefers-color-scheme` + `html[data-theme]`).

**Ràng buộc kỹ thuật (đã xác nhận trong code):**
- Không bọc `React.StrictMode` khi dùng Google Maps Vector (tránh double-mount WebGL).
- Map shell: tránh View Transitions và `transform` press trên nút (GPU thrash).
- `--map-canvas-bg` không dùng brand green (tránh flash clear GPU).
- Mobile và web độc lập: không import/copy source giữa `exe-homeji-web` và `exe-homeji-mobile`.

## Brand Commitments

- Tên: **Homeji**; logo `public/brand/homeji-logo.png`.
- Giọng UI: tiếng Việt, ngắn gọn, thực dụng (nhãn trạng thái tin, vai trò, sở thích ở ghép trong `labels.ts`).
- Màu thương hiệu chính: xanh lá Grab `#00b14f` / hover `#009241`; liên kết/CTA phụ xanh `#136fd8`.
- Landing guest: Manrope + Be Vietnam Pro; app shell mặc định Inter.

## Evidence on Hand

- Copy landing thật trong `GuestHero.tsx` / CSS landing.
- Token CSS thật trong `src/index.css`.
- Routes thật trong `src/App.tsx`.
- Không bịa testimonial, số liệu tăng trưởng, hoặc pricing chưa có trong UI.

## Product Principles

1. **Bản đồ là ngôi nhà** — sau đăng nhập, ưu tiên trải nghiệm trong map shell; đừng tách lại thành nhiều trang shell trừ khi có lý do rõ.
2. **An tâm trước thẩm mỹ** — thông tin chỗ ở, trạng thái tin, lỗi mạng/API phải rõ; không che lỗi bằng decoration.
3. **Giữ ngôn ngữ Việt** — nhãn, empty/error, CTA khớp giọng hiện có; không Anh hóa toàn bộ UI khi refactor.
4. **Tôn trọng token hiện có** — mở rộng `--grab-*`, `--maps-*`, `--surface-*` thay vì invent palette mới.
5. **Hai app độc lập** — cùng API path, không dùng chung component/CSS source với mobile.

## Accessibility & Inclusion

- Focus keyboard: `:focus-visible` outline `--maps-blue`; tắt outline chuột/touch.
- Safe-area insets cho notch / home indicator.
- Touch targets lớn trên `.btn` (min-height 48px; `.btn-sm` 36px).
- Hỗ trợ light/dark; contrast text trên surface muted.
