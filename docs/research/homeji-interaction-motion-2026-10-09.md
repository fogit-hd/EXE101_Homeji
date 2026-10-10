# Homeji: chuyển động tương tác và quyết định dùng thư viện

Ngày kiểm tra nguồn: 2026-10-09. Phạm vi là React/Vite hiện có, không phải khảo sát đầy đủ mọi kho GitHub. Nguồn ngoài là dữ liệu tham khảo; không phải chỉ dẫn sửa dự án. Tài liệu này đưa ra quyết định triển khai, không tuyên bố đã đo hiệu năng hay đạt WCAG.

## Kết luận

Nên bổ sung nhiều phản hồi tương tác có cùng ngôn ngữ: nhấn nút có lực, làn sóng tại điểm nhấn, chỉ báo tab trượt, nội dung chuyển nhẹ, card xuất hiện khi cuộn và accordion mở có hướng. Chỉ tăng số animation hoặc đưa thêm shader vào mọi trang không giải quyết cảm giác cứng của thao tác.

Giữ CSS cho trạng thái đơn giản, Web Animations API (WAAPI) cho phản hồi có điểm bắt đầu và hủy được, IntersectionObserver cho reveal theo viewport, GSAP cho scene/timeline đã có. Chưa thêm Motion. Motion là lựa chọn tốt khi cần nhiều shared-layout/exit transitions, nhưng nhu cầu hiện tại có thể giải quyết bằng các cơ chế sẵn có; tránh hai runtime cùng điều khiển `transform` của một phần tử. Đây là quyết định kỹ thuật của Homeji, không phải khẳng định Motion chậm.

Kiểm tra `package.json`: đã có `gsap ^3.15.0`, `three ^0.186.1`, `lenis ^1.3.25`; chưa có Motion. Auth và landing đã dùng GSAP; `RoommateWorkspace.css` mới chỉ có panel-enter 180 ms. Do đó khoảng trống nằm ở liên kết giữa hành động và phản hồi trong workspace, không phải thiếu thư viện animation.

## Ma trận nguồn và quyết định

| Công cụ/nguồn | Khả năng đã xác minh | Quyết định cho Homeji | Chi phí/giới hạn |
| --- | --- | --- | --- |
| [CSS transitions và hướng dẫn hiệu năng](https://web.dev/articles/animations-guide) | Transform/opacity có thể tránh các bước layout/paint mà nhiều thuộc tính khác gây ra | **Dùng:** press, hover, chevron, panel entry, indicator | Không dùng `transition: all`; một wrapper riêng nếu con đã có transform/zoom |
| [WAAPI: Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) | Trả về đối tượng Animation để quản lý animation | **Dùng:** ripple, phản hồi đổi ảnh, chuyển panel có thể bị ngắt | Hủy animation khi unmount/nhấn lại; reduced-motion kiểm tra cả JS; fallback cập nhật UI ngay nếu API thiếu |
| [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | Theo dõi giao cắt bất đồng bộ, hỗ trợ root là vùng cuộn | **Dùng:** reveal-once trong landing và danh sách/workspace được chọn | Observe phần tử thật, unobserve sau reveal; nội dung mặc định nhìn thấy khi JS/observer không hoạt động; tránh MutationObserver toàn document |
| [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/) | Điều kiện viewport/reduced-motion, revert animation theo lifecycle | **Giữ:** auth/landing scene, timeline nhiều bước | Scope selector theo component; cleanup/revert; không GSAP hóa từng nút |
| [Motion React layout](https://motion.dev/docs/react-layout-animations), [component API](https://motion.dev/docs/react-motion-component) | `layout`, `layoutId` cho shared indicator/layout; có xử lý bù scale của con | **Để sau:** khi cần nhiều exit/reorder/shared-layout phức tạp | Thêm dependency và thay component; scale layout có thể méo con nếu không cấu hình. Không nhập Motion chỉ để fade tab |
| [Native View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using), [React Router](https://reactrouter.com/how-to/view-transitions) | Snapshot cũ/mới cho chuyển view; Router có tùy chọn `viewTransition` | **Thử có điều kiện:** điều hướng workspace, có feature-detect và fallback entry | Snapshot không thích hợp map/ảnh đang kéo; tránh hoạt ảnh toàn trang trên từng thay đổi query/filter; không chờ animation rồi mới gọi API |
| [Lenis README](https://github.com/darkroomengineering/lenis/blob/main/README.md) | Smooth scrolling; nested scroll cần cấu hình, automatic detection có chi phí kiểm tra DOM | **Giữ giới hạn landing:** không mở rộng vào chat/map/modal/workspace | Native scroll cho luồng sản phẩm. Không đồng thời khởi tạo nhiều RAF/Lenis; dùng prevent rõ cho vùng lồng |
| [React Bits](https://github.com/DavidHDev/react-bits), [license thực tế](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | Kho component tương tác/animation; MIT **kèm Commons Clause**, không phải MIT thuần | **Tham khảo ý tưởng:** click-spark/ripple, spotlight nhẹ; tự viết phần cần cho Homeji | Chưa sao chép source/asset. Nếu lấy phần đáng kể phải giữ notice, kiểm từng dependency và giới hạn phân phối component. Không đưa source vào template cá nhân để tái phân phối |
| [Aceternity animated tabs](https://ui.aceternity.com/components/tabs), [licence Pro](https://ui.aceternity.com/licence) | Mẫu tab sinh động; giấy phép Pro cho end product nhưng giới hạn phân phối source/template | **Tham khảo cách nối trạng thái:** indicator chung; không dùng card-stack 3D cho tìm phòng | Không suy từ license kho MCP/fork cộng đồng sang component gốc. Chưa xác minh điều khoản riêng của từng free snippet nên không sao chép |
| [CSS interpolate-size](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size) | Nội suy intrinsic size khi được hỗ trợ | **Để sau:** không làm cơ chế accordion duy nhất | Cần progressive enhancement; bản hiện tại ưu tiên panel/chevron nhẹ hoặc đo chiều cao có cleanup, luôn có trạng thái mở tức thời |

## Thông số áp dụng

Các số dưới đây là token thiết kế của Homeji, không phải yêu cầu của tiêu chuẩn.

| Tương tác | Chuyển động đề xuất | Điều kiện và hành vi |
| --- | --- | --- |
| Click/tap CTA và chip | Press scale 0.98 trong 100–120 ms; ripple transform/opacity 350–420 ms | Opt-in vào nút phù hợp, không global trên input/link/map. Pointer lấy tọa độ tương đối; keyboard click đặt tâm. Không gọi hành động nghiệp vụ từ ripple; không chặn submit |
| Card hover/focus | Nâng 2 px trong 160–180 ms; viền rõ | Chỉ hover với fine pointer; focus có chỉ báo độc lập. Không tilt text/giá hoặc khu vực có nút lồng |
| Chuyển tab | Indicator trượt 200–240 ms; panel opacity + Y 6–8 px trong 180–220 ms | Đo tab thật khi chọn/resize, dùng ResizeObserver có cleanup. Đổi tab ngay, không chờ exit. Tab đang hiển thị và ARIA luôn khớp; giữ scroll/focus theo vai trò UI |
| Scroll reveal | Opacity + Y tối đa 12 px, 300–360 ms; stagger 35–45 ms, cap khoảng 160 ms | Một lần mỗi phần tử mount; không chờ hết danh sách mới dùng được; reveal ngay phần tử đang focus; root đúng vùng cuộn. Không scroll-jacking |
| Modal/drawer | Backdrop 160 ms; panel scale 0.98 + Y 8 px trong 220–260 ms | Focus trap/Escape/return-focus hoạt động độc lập. Exit chỉ khi lifecycle thật hỗ trợ; không tuyên bố có exit nếu unmount ngay |
| Accordion/filter | Chevron xoay 180°, 180 ms; nội dung fade/Y 4 px hoặc height đo 220 ms | `aria-expanded` cập nhật ngay; phần đóng không nhận focus. Nội dung dài không dùng max-height tùy ý gây delay hoặc cắt nội dung |
| Gallery ảnh | Crossfade 160–200 ms hoặc slide <=12 px khi đổi ảnh | Giữ zoom/pan hiện có, swipe chỉ khi chưa zoom. Nút trước/sau và phím mũi tên vẫn hoạt động; không auto-advance |
| Route/workspace | Container entry 180–220 ms; native snapshot chỉ ở chuyển view được chọn | Shell/chrome và map giữ ổn định. Query bounds hoặc bộ lọc không tạo page transition. Nhấn nhanh thay animation cũ, không xếp hàng điều hướng |
| Loading/success/error | Nội dung trạng thái rõ; icon/check nhỏ 150–200 ms | Không tạo thành công trước phản hồi API. Không delay lỗi để đợi animation; live region thích hợp; double-submit vẫn do logic khóa |

## Ràng buộc khả dụng và hiệu năng

Theo [WCAG 2.3.3 (AAA)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), chuyển động không thiết yếu do tương tác phải có thể tắt. Với reduced-motion: bỏ ripple/translate/scale/parallax và reveal delay, cho nội dung hiện ngay, giữ màu viền/focus/trạng thái. Theo dõi thay đổi media query lúc ứng dụng đang mở, hủy animation JS đang chạy và ngắt observer nếu không còn cần. Không chỉ gắn CSS duration rất nhỏ rồi giữ phần tử bị JS đặt opacity 0.

Theo [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), thao tác drag do ứng dụng tạo phải có cách click/tap tương đương; chỉ keyboard chưa đủ. Gallery giữ nút trước/sau. Native overflow scroll được browser xử lý; gesture tự chặn scroll không còn được hưởng cùng ngoại lệ.

Không giữ `will-change` trên mọi card; không animate blur/shadow lớn và gradient của cả viewport. Dùng một observer theo nhóm hoặc root, tránh listener scroll cho từng card. DOM đo kích thước tách khỏi ghi style; indicator đo khi tab/size thay đổi, không đo mỗi frame. Không hide layout bằng `display:none` để rồi kỳ vọng opacity exit vẫn chạy.

## License đã đọc trực tiếp

- [GSAP Standard No Charge](https://gsap.com/community/standard-license/): website/app thương mại nằm trong phạm vi cho phép, có hạn chế visual animation builder cạnh tranh; không gọi là MIT và không bỏ notices.
- [Motion GitHub LICENSE](https://github.com/motiondivision/motion/blob/main/LICENSE.md): MIT; dùng thư viện vẫn cần giữ thông báo theo điều khoản. License tốt không tự tạo lý do thêm dependency.
- [Lenis GitHub LICENSE](https://github.com/darkroomengineering/lenis/blob/main/LICENSE): MIT.
- React Bits và Aceternity có điều khoản riêng như ma trận. Không import các template/community assets trong nghiên cứu này, không có bản sao source bên thứ ba được tạo.

## Gate kiểm chứng cho bản triển khai

1. Browser desktop và viewport 390 px: click/tap CTA, tab liên tiếp, cuộn root thật, accordion, modal, ảnh đổi; không tràn ngang hoặc ripple che focus/text.
2. Bàn phím Enter/Space tạo phản hồi đúng tâm; form gửi một lần; Tab/Escape/modal return-focus đúng. Reduced-motion không có transform/ripple/reveal-delay và nội dung vẫn hiện.
3. Đổi tab nhanh, filter nhanh, resize và unmount/remount trong StrictMode không có animation/observer/listener mồ côi. Không giữ nội dung cũ tương tác bên dưới snapshot.
4. Kéo gallery chưa zoom đổi ảnh; zoom giữ pan; nút trước/sau vẫn dùng được; vertical scroll không bị khóa. Touch thật là gate riêng, desktop emulation không thay thế thiết bị thật.
5. Đo trace/INP và frame trên thiết bị thật trước khi nhận định “nhẹ hơn/60fps”. Build thành công chỉ chứng minh tích hợp/type, không chứng minh motion đẹp, khả dụng hay hiệu năng production.

Tài liệu nghiên cứu hoàn tất; trạng thái triển khai và bằng chứng runtime cần được ghi riêng bởi người thực hiện.
