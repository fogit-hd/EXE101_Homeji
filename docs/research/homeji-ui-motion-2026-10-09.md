# Homeji: UI, màu sắc và chuyển động

Ngày nghiên cứu: 2026-10-09. Phạm vi: ứng dụng React/Vite hiện tại; đề xuất dưới đây là quyết định thiết kế cho Homeji, không phải kết luận đã chạy kiểm thử khả dụng với người dùng.

## Kết luận áp dụng

Giữ GSAP và Three.js đã có, dùng CSS cho tương tác thường ngày. Không thêm Motion hoặc thư viện kéo thả để giải quyết vài hiệu ứng nhỏ. Chuyển động phải giải thích một thay đổi trạng thái: mở nội dung, chuyển tab, đổi ảnh, xác nhận thao tác. Tăng số hiệu ứng không tự làm trải nghiệm tốt hơn.

Homeji hiện đã có token nền lạnh/trắng và teal trong `src/index.css`, nhưng nhiều trang còn màu kem/cam/xanh lá trực tiếp, một số vùng tối không theo cùng token. Vì vậy cần sửa việc dùng màu nhất quán trước khi đổi toàn bộ bảng màu lần nữa. `src/ui-consistency.css`, `MarketplacePage.css` và chrome của bản đồ là các điểm kiểm tra chính. Giữ ảnh phòng và đồ dùng làm phần giàu màu nhất.

## Hệ màu và chữ

| Vai trò | Hướng chọn | Cách dùng |
| --- | --- | --- |
| Nền trang | xanh xám rất nhạt, khoảng `#F3F7FA` | Một canvas chung cho phòng, ở ghép, chợ đồ |
| Bề mặt | trắng; màu tối có token riêng | Card, form, popup; tránh trắng cố định trong dark mode |
| Chữ chính | xanh mực, khoảng `#19323B` | Tiêu đề, giá, nội dung chính |
| Hành động | teal đậm, khoảng `#087F8C` | Một CTA chính, tab chọn, focus; không tô mọi card |
| Phân cấp | xanh xám, viền nhẹ | Nội dung phụ và ranh giới; vẫn kiểm tra tương phản |
| Trạng thái | xanh thành công, đỏ lỗi, amber chờ | Có nhãn/icon kèm theo, không chỉ dựa vào màu |
| AI | phổ bảy màu trên viền | Chỉ vùng AI; không thay màu hành động hoặc trạng thái |

Be Vietnam Pro là font UI chung; giữ dấu tiếng Việt, line-height nội dung khoảng 1.5–1.65, tiêu đề đủ chỗ cho dấu. Tránh serif cho tiêu đề tin và giá; font trang trí chỉ cân nhắc ở nội dung mở đầu. Giảm các font không còn dùng thay vì tải đồng thời nhiều họ chữ. Các mã màu trên là lựa chọn thiết kế, cần đo tương phản trên từng cặp foreground/background sau khi áp dụng.

## Quy tắc motion có thể tái sử dụng

| Tương tác | Quyết định cho Homeji | Điều kiện / giới hạn |
| --- | --- | --- |
| Nhấn nút | scale 0.98, khoảng 120 ms, hoặc đổi lớp nền | Giữ focus-visible; không làm lệch layout |
| Card hover | nâng 2 px, 150–180 ms | Chỉ pointer chính xác có hover; mobile không phụ thuộc hover |
| Chuyển tab ở ghép | opacity + translateY 6 px, 180 ms | Hiển thị dữ liệu ngay; không đợi animation mới gọi API |
| Popup / trợ lý | opacity + scale 0.98 → 1 và translateY tối đa 6 px, 200–240 ms | Focus/Escape/đóng hoạt động độc lập animation |
| Gallery phòng | cuộn ngang, CSS scroll snap và nút trước/sau | Vuốt là bổ sung; có click, phím và mô tả ảnh hiện tại |
| Cuộn nội dung | cuộn native trong workspace | Không ghim chuột hoặc ép cuộn ngang trong luồng tìm phòng/chợ đồ |
| Landing / auth | GSAP cho scene hiện có; Three.js chỉ trang có scene | Tạm dừng ngoài màn hình/tab ẩn; không che form hoặc chặn đăng nhập |
| Trạng thái gửi lời mời | loading → thành công/lỗi, nội dung rõ | Không dùng vuốt để gửi lời mời; tránh gửi trùng khi nhấn nhiều lần |

Thông số thời gian và khoảng cách là quyết định của dự án, không phải yêu cầu trong WCAG. Khung tab 180 ms đã được đưa vào `RoommateWorkspace.css`; gallery có thể triển khai bằng cơ chế cuộn của trình duyệt, không cần thêm dependency. Cần kiểm chứng phiên bản cuối trong browser trước khi đánh dấu hoàn tất.

## Viền AI bảy màu

Chọn mép khoảng 2 px rõ màu với lớp sáng mờ **vào trong** 6–10 px, giảm opacity dần, tương tự mép màn hình; không dùng dải màu dày che nội dung. Tạo một lớp pseudo-element được clip/mask theo bo góc, đặt `pointer-events: none`; lớp nội dung nằm trên nó. Khung search, nút gọi AI và popup dùng chung token/component, không nhân bản ba bộ keyframe.

Cho màu chạy nhẹ khi focus hoặc đang xử lý; trạng thái nghỉ tĩnh hoặc rất tiết chế. Khi người dùng bật giảm chuyển động, dừng quay/đổi vị trí, giữ viền tĩnh để vẫn nhận diện AI. Không dùng hiệu ứng làm tín hiệu duy nhất của loading/error. Thử cả khung search nhỏ và popup lớn: mask không được mất trên trình duyệt thiếu một cú pháp, nội dung và focus ring vẫn đọc được. Tránh animation blur lớn, box-shadow toàn viewport và gradient repaint liên tục trên tất cả card.

## Khả dụng và hiệu năng

- Giảm chuyển động phải được kiểm tra ở CSS và JavaScript: `prefers-reduced-motion`, `gsap.matchMedia()` và cleanup/revert khi unmount. Hành vi gửi form, mở tab và gọi API không phụ thuộc `animationend`.
- Modal thật phải quản lý focus, giữ Tab bên trong, hỗ trợ Escape, có nút đóng, trả focus về nút mở và làm nền inert. `aria-modal=true` chỉ khi thực sự có hành vi modal. Chat nổi không modal không được tự bẫy focus như dialog modal. [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Custom drag phải có cách click/tap tương đương; chỉ bổ sung keyboard vẫn chưa đủ cho tiêu chí này. Native overflow scrolling có cơ chế do browser cung cấp. [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
- Animation do tương tác nên tắt được khi không thiết yếu; parallax/zoom lớn cần đặc biệt thận trọng. Đây là hướng thiết kế an toàn theo tiêu chí AAA 2.3.3, không tuyên bố toàn ứng dụng đã đạt WCAG. [W3C animation guidance](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions).
- Ưu tiên transform/opacity; tránh animation kích thước gây layout liên tục. Đo frame/INP trên điện thoại thật trước khi tăng độ phức tạp; không giữ `will-change` trên hàng trăm card. [Google animation performance guidance](https://web.dev/articles/animations-guide).
- Scene Three.js cần giải phóng geometry/material/texture/renderer, hủy RAF/listener khi rời trang; nội dung đăng nhập vẫn phải hoạt động khi WebGL thất bại. Không đưa Three.js vào danh sách phòng chỉ để làm hiệu ứng popup.

## Nguồn chính thức và GitHub đã kiểm tra

| Nguồn | Bằng chứng và quyết định |
| --- | --- |
| [GSAP package source](https://github.com/greensock/GSAP/blob/master/package.json) | Version nguồn 3.15.0; khai báo giấy phép Standard no-charge, **không phải MIT**. Khớp dependency hiện có. |
| [GSAP current license](https://gsap.com/community/standard-license/) | Cho phép sử dụng website/app thương mại theo điều khoản hiện tại; có giới hạn với công cụ visual animation cạnh tranh. Homeji là ứng dụng thuê phòng, không phải animation builder. Giữ notices của thư viện. |
| [GSAP React source](https://github.com/greensock/react/blob/main/README.md) | Mẫu scoped context và cleanup. Không cần thêm `@gsap/react` khi component hiện đã quản lý `gsap.context().revert()` đúng. |
| [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/) | Hỗ trợ điều kiện viewport/reduced motion và revert các animation theo lifecycle. |
| [Three.js license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) | MIT; giữ thông báo bản quyền khi sao chép phần mã đáng kể. Thư viện đã có trong dự án. |
| [Lenis license](https://github.com/darkroomengineering/lenis/blob/main/LICENSE) | MIT; dependency đã có nhưng không dùng làm lý do áp smooth-scroll lên mọi workspace. |
| [CSS scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap) | Nền tảng cuộn/gallery native; giảm phần gesture tự viết. |
| [Motion reduced motion](https://motion.dev/docs/react-use-reduced-motion) | Đối chiếu cách giảm dịch chuyển/parallax; không nhập thêm thư viện vì CSS và GSAP hiện có đáp ứng phạm vi. |

GitHub connector đã đọc nguồn GSAP, README React, LICENSE Three.js và Lenis. GSAP không có file LICENSE ở đường dẫn đã thử; giấy phép được xác minh qua package.json và trang chính thức thay vì suy ra từ việc repo công khai. Không sao chép nguyên template từ repository cộng đồng, không nhập asset không rõ quyền sử dụng. Các nguồn bên ngoài là tài liệu tham khảo, không phải chỉ dẫn thay đổi phạm vi dự án.

## Kiểm chứng trước phát hành

1. Desktop + viewport 390 px: không tràn ngang ngoài gallery; form và nội dung tiếng Việt không cắt dấu; màu chữ/CTA/focus đủ tương phản.
2. Bàn phím: chuyển tab, mở/đóng popup, gallery trước/sau, gửi lời mời và retry lỗi đều làm được; focus không biến mất sau chuyển cảnh.
3. Touch: gallery vuốt ngang không khóa cuộn dọc; nút trước/sau vẫn bấm được; không phát sinh lời mời hoặc giao dịch từ kéo ảnh.
4. Reduced motion: không còn chuyển vị trí/zoom/quay AI tự động; các luồng dữ liệu vẫn hoàn thành.
5. Race/error: đổi bộ lọc nhanh không hiện kết quả cũ; double click không gửi trùng; lỗi API hiện thông báo và cho retry.
6. Dark theme, WebGL unavailable và unmount/remount: token bề mặt/chữ nhất quán; không còn canvas/tween/listener chạy sau rời auth.

Các phần như hiệu ứng kéo thả toàn trang, scroll-jacking, shader nền toàn ứng dụng và thêm framework animation thứ hai được để sau vì chưa có nhu cầu sản phẩm hoặc bằng chứng hiệu năng phù hợp.

## Quyết định triển khai đã kiểm tra

Gallery hiện có zoom/pan, nên lần này bổ sung gesture Pointer Events có ngưỡng ngang 56 px và ưu thế ngang 1.5 lần chiều dọc; không thay bằng scroll-snap để tránh hồi quy zoom. Nút trước/sau và phím mũi tên giữ nguyên. Đã kiểm tra kéo chuột trên Edge và helper ngưỡng; chưa thử thiết bị cảm ứng thật. Checklist phía trên là tiêu chí thiết kế, không phải tuyên bố tất cả đã được chứng nhận WCAG hoặc đo trên thiết bị thật.
