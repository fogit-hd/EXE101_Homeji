# Hệ kính Homeji theo sáu ảnh tham chiếu

## Đọc ảnh và giới hạn suy luận

Ảnh 1 nhấn mạnh vùng cong phóng đại/bẻ hình ở mép, lóe sáng hẹp và lõi còn nhìn xuyên. Ảnh 2 cho thấy viền sáng không đồng đều: mép trên-trái mạnh, giữa trong, mép dưới có phản sáng; bóng nằm sát mặt nền làm khối kính tách khỏi nền. Ảnh 3 có một khối chọn nổi cao hơn đường ray màu, không phải mỗi tab là một nút đục riêng. Ảnh 4–6 cho thấy thumb kính độc lập chạy trên màu trạng thái của switch. Từ ảnh tĩnh không suy ra chính xác chiết suất, độ dày vật lý hay diễn tiến animation; triển khai là mô phỏng quang học 2D, không phải ray tracing.

## Bẻ hình theo biên khối

Bản cũ kéo một normal map vuông lên mọi tỷ lệ, khiến nút dài giống thấu kính ellipse, biến dạng ngang tăng theo chiều rộng. Bản mới sinh sáu normal map cho capsule tỷ lệ 1/2/3/4/6/10. Mỗi điểm lấy tâm gần nhất trên trục giữa đoạn capsule, tính normal hướng ra biên; độ cong tăng theo lũy thừa 5 khi gần mép. Lõi gần trung tính để nền không bị nhão toàn bộ.

Với feDisplacementMap, độ dời là scale nhân giá trị kênh trừ 0.5. Khi dùng objectBoundingBox, trục X nhân chiều rộng và trục Y nhân chiều cao. Kênh R vì thế được chia theo tỷ lệ rộng/cao; blur X cũng được bù tương ứng. Điều này giữ độ sâu mép gần ổn định khi nút kéo dài. Bộ sinh bù kích thước và dùng điểm đầu-cuối thực để tránh giảm cường độ ở đầu capsule hẹp do lấy mẫu.

ResizeObserver chọn map gần nhất theo tỷ lệ thực, gồm khi resize viewport hoặc font đổi. Chỉ xử lý batch khi hình học đổi; không có animation JS mỗi frame hoặc canvas/WebGL riêng cho từng nút. Sáu PNG dùng chung khoảng 47 KB, không tải ảnh từ bên ngoài. Mỗi map có ba filter dùng chung ảnh: nút thường dùng displacement 0,10; mặt kính chữ dùng 0,14 khi nghỉ và 0,28 lúc nhấn/kéo; blur bằng 0 để lõi và chữ không bị phủ sương. Cường độ tab thấp hơn vì giờ cả chữ/icon bên dưới cũng đi qua kính; mức 0,42 cũ gây vệt trắng gắt ở biên thanh dài. Không tăng khúc xạ của các nút khác khi kéo tab. Đây vẫn là lượng tử hóa sáu tỷ lệ, không phải map chính xác từng pixel kích thước tùy ý.

## Độ trong và chiều sâu

Nền nút thường có tint trắng khoảng 4%; phần phản sáng là lớp gradient riêng, không phủ trắng đục cả lõi. Mép trên có highlight hẹp, hai bên có phản sáng khác cường độ, mép dưới có caustic giả lập và bóng tiếp xúc nhỏ. Bóng rơi mềm hơn ở ngoài giúp phân biệt khối nâng lên với nét viền vẽ phẳng. Không dùng text-shadow để tạo cảm giác kính. Nút thường/select/menu dùng pseudo-face ở slot còn trống để bẻ chính nhãn gốc, không clone hoặc bọc lại React children; tab đặt lens ở lớp z-index 2 trên các button ở lớp 1, để cả chữ/icon bên dưới bị khúc xạ khi kính lướt qua. Lens tab có phản sáng mảnh ở mép và caustic mỏng phía dưới; vị trí nguồn sáng đổi theo pointer trong thao tác, độc lập với nhãn. Lõi chỉ có tint trắng rất nhẹ, không tô trắng đục.

Một viền trắng đồng đều + blur mạnh thường thành kính mờ hoặc nút nhựa. Khúc xạ chỉ thấy rõ khi nền có chi tiết đi qua vùng nút; trên nền phẳng phải dựa vào phản sáng, bóng và silhouette. Không thêm họa tiết giả vào nút để làm như đang bẻ nền. Không tô tím/cyan theo ảnh minh họa; màu đường ray và state dùng palette Homeji. Lóe giao thoa màu như ảnh 1 được tiết chế, không thêm viền cầu vồng vào mọi control.

## Tab chọn và select

LiquidTabList giữ đúng một phần tử lens, được vẽ trên nhãn nhưng không bắt pointer. Khi nghỉ, lens vừa với chiều cao tab/đường ray. Trong lúc nhấn/kéo hoặc nhịp click, lens nở 2,5% ngang và 10% dọc rồi thu về theo spring 300ms; nhãn không đổi kích thước layout, nhưng hình ảnh của chữ/icon đi qua lớp backdrop của lens. Lens vẫn trượt theo vị trí/chiều rộng button trong 460ms với spring vượt tối đa 3,5% rồi ổn định khi chọn bằng click/bàn phím; khi kéo thì bám pointer trực tiếp. Các tab chưa chọn là nhãn trên ray, không phải nhiều capsule nổi cạnh nhau. Màu chữ tách biệt giữa selected/unselected. Track có khoảng đệm đủ để mép lens không bị clipping; các rail dài cuộn ngang và đưa mục đang chọn vào viewport mà không cuộn cả trang.

Wrapper giữ onClick, API/filter state, IDs và aria-controls của caller. Phím mũi tên/Home/End chọn được mục không disabled; tabIndex theo lựa chọn. Pointer capture hỗ trợ chuột/chạm/bút; vượt ngưỡng 5px mới là kéo, preview không đổi state nghiệp vụ, thả mới chọn mục gần nhất. Cancel/mất capture khôi phục lựa chọn cũ. Đường ray kéo dài theo toàn bộ nội dung cuộn để tab cuối trên điện thoại không mất nền. Dùng cho profile, gói/giao dịch, thông báo, quản trị, tin tìm phòng, ví, lọc inbox và các nhóm dùng MotionTabs/SegmentedTabs (chợ/chi tiết địa điểm). Select vẫn là ChoicePicker có native select liên kết, form/change/reset/required giữ nguyên; trigger là capsule kính với chevron riêng. Nút công tắc giao diện dùng thumb kính, màu trạng thái nằm ở ray phía dưới.

## Điều kiện thật để nhìn xuyên

Opacity/filter/mask/backdrop-filter của tổ tiên có thể tạo backdrop root và chặn việc lấy nền bên ngoài. Do đó animation vào hero phải giải phóng opacity sau khi kết thúc; không giữ will-change opacity trên cụm CTA. Không dùng blur của cả cha header làm thay thế cho blur/khúc xạ riêng của nút con. Lỗi này đã được bắt bằng phép so sánh ảnh CTA thật khi chỉ đổi displacement scale về 0.

## Tương thích và kiểm chứng

Không hỗ trợ SVG backdrop thì dùng blur nhẹ + phản sáng/bóng. Forced colors tắt filter và dùng màu hệ thống; reduced transparency/contrast cao dùng lớp đục dễ đọc; reduced motion tắt chuyển động lens. Chưa xác minh quang học SVG trên Safari/Firefox hay FPS trên điện thoại thật.

- Unit geometry kiểm tra chọn hình tròn/capsule/dài, tâm trung tính, hướng cong đối xứng và bù độ dời ngang.
- liquid-tabs.e2e.mjs chạy các tab thật ở profile/payment/marketplace, kiểm tra cùng một lens còn tồn tại khi đổi mục, ảnh pixel của ray thật đổi khi bỏ displacement, căn chỉnh vị trí/độ cao và không bị cắt, phím mũi tên và rail 320px.
- liquid-glass-lens và liquid-glass-cta kiểm tra biến dạng pixel thật, CTA trên ảnh nền thật, mobile, keyboard/focus và fallback.
- choice-picker, liquid-glass-app, payment-flow giữ các contract tìm/lọc/chọn, FormData, disabled/reset, giao dịch fixture và menu bàn phím.
- auth-login-gallery và theme-drop kiểm tra login, ảnh nhà chạy chậm, trạng thái/error/điều hướng, chuyển sáng-tối và bản nháp.

Test gọi API fixture không phải bằng chứng giao dịch hay OAuth production hoàn tất. Bộ unit rộng còn ba lỗi hiện hữu: adapter admin thiếu AdminAnalyticsSkeleton, hub palette assertion và notification contrast assertion. Adapter admin đã được bổ sung component LiquidTabList thật để không tạo lỗi import mới; chưa thay đổi nghiệp vụ các mục này.

Nguồn kỹ thuật chính thức:
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap

## Điều chỉnh theo phản hồi về kích thước nghỉ

Không giữ lens phồng thường trực. Ảnh phồng chỉ mô tả trạng thái tương tác, không phải mặc định. Bộ nguồn Figma/Apple và giới hạn asset được ghi trong [nghiên cứu nguồn tương tác](research/liquid-glass-interactive-sources.md). Kiểm tra bổ sung trên trang hồ sơ thật với API fixture: chiều cao nghỉ bằng tab, giữ nhấn nở, kéo không đổi tab trước khi thả, thả chốt mục đích, cancel phục hồi, touch-drag ở 390px và nền ray ở mục cuối 320px.

Kiểm chứng tương tác bổ sung: so sánh hai ảnh khối kính đang nhấn phải ổn định trước; sau đó chỉ đặt displacement của filter tương tác về 0 thì pixel ray thật phải đổi. Việc này tách bằng chứng khúc xạ khỏi animation scale và các lớp phản sáng vẽ bằng CSS. Phản sáng là mô phỏng bề mặt, còn displacement lấy nền DOM thật; trên ray một màu, mép giao với nền là nơi biến dạng dễ thấy nhất.

### Bẫy tối ưu CSS của bản production

Khai báo `-webkit-backdrop-filter` trước và `backdrop-filter` chuẩn sau. Thứ tự ngược khiến bản CSS tối ưu giữ riêng tiền tố WebKit; Chrome bỏ qua nên tab/switch chỉ còn viền sáng dù Vite dev vẫn có khúc xạ. Kiểm tra dev không đủ: sau `npm run build`, chạy `npm run preview -- --host 127.0.0.1 --port 5500 --strictPort`, đặt `HOMEJI_THEME_TEST_URL=http://127.0.0.1:5500` rồi chạy `node tests/liquid-tabs.e2e.mjs`. Bộ này kiểm tra filter tính toán, pixel khúc xạ thật và trạng thái tương tác trên CSS đã tối ưu. Cũng kiểm tra lại filter tính toán trên URL đã deploy.

## Chữ phải nằm dưới kính tab

Bản trước cố giữ nhãn trên kính khiến kính và chữ trông rời nhau. Bản sửa để lens lấy backdrop gồm chính các glyph phía dưới, giảm vệt lóe và ánh caustic; vùng giữa đọc rõ, mép bẻ chữ khi đi qua. Kiểm tra hồi quy làm phẳng màu ray, tạm bỏ các lớp phản sáng trang trí rồi so sánh crop của chữ khi tắt/bật riêng displacement: ảnh chữ phải đổi. Cách này không dùng thay đổi màu nền hay viền sáng để thay thế bằng chứng khúc xạ chữ. Kiểm tra thêm các tab quản trị thật Tin chờ duyệt / Xác minh chủ nhà / Rút tiền với API fixture.

## Cân lại độ trong và độ nảy — 19/10/2026

Không dùng blur để mô phỏng độ dày. GaussianBlur giữ trong chuỗi filter nhưng stdDeviation bằng 0; độ nổi đến từ viền phản sáng mảnh và bóng tiếp xúc. Normal field tăng theo power 5 để dồn cong sát mép hơn; displacement giảm cho cả nút thường và tab. Phép thử chữ tập trung ở mép kính đang tương tác, không buộc lõi nghỉ phải bóp méo chữ. Tab nhô tối đa 10% dọc và dùng spring tuyến tính với overshoot 3,5%; trình duyệt thiếu linear() dùng cubic-bezier. Tôn trọng reduced-motion, không scale layout hoặc thay đổi handler chọn tab.

Phản sáng tab dùng border bất đối xứng và glint cao 2px, không dùng cặp mask-composite có thể bị tối ưu thành lớp phủ sáng cả lõi. Kiểm tra ảnh trên bản build tối ưu để xác nhận mặt kính không còn phủ trắng.

## Toàn hệ điều khiển, tán sắc và lõi trong — cập nhật 19/10/2026

Theo yêu cầu tăng từ ví dụ 10 lên 40, depth của lớp chữ tăng đúng bốn lần so với mốc 0,035/0,07 thành 0,14/0,28. Đây là hệ số shader, không phải cam kết mọi glyph lệch đúng bốn lần số pixel vì còn tùy vị trí trong lens và nền. Giữ blur 0, power 5 và spring nhẹ.

Nút thường, CTA, select trigger, option/menu mở nổi dùng pseudo-face chung trên nội dung. Bộ đăng ký chọn pseudo-element chưa được component sử dụng; giữ nguyên trang trí cũ, DOM con của React, accessible name, focus và native events. Tab vẫn dùng một lens chung; thumb switch nằm trên các icon để khúc xạ khi trượt. Material được đăng ký cả khi route/portal sinh thêm controls. Google Maps/vendor controls giữ renderer riêng.

Bộ SVG tách ba ảnh nền với depth đỏ/lục/lam lệch −0,025 / 0 / +0,025; giữ từng kênh bằng ColorMatrix rồi cộng lại. Bước cuối lấy alpha từ nhánh lục bằng composite `in`, tránh cộng alpha ba lần làm lõi đục. Có thêm vài glint màu rất mảnh ở mép, không tô toàn bộ khối thành nền cầu vồng. Tham khảo primitive chính thức: [feColorMatrix](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feColorMatrix), [feComposite](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feComposite).

Tint nền thường giảm 4% xuống 1,2%; lớp mặt trên trong suốt ngoài glint, màu trạng thái giảm nhẹ để không phủ mờ nội dung. Popover giữ nền đủ đọc chữ; không dùng kính của nút thay cho độ tương phản của panel chứa danh sách.

`glass-dispersion.e2e.mjs` kiểm tra controls thật trên profile/payment/marketplace/admin/login/register/guest và picker portal; so sánh ảnh khi RGB có độ cong khác nhau với khi cả ba cùng depth để tách bằng chứng tán sắc khỏi glint trang trí; kiểm tra blur 0, depth 4x và forced-colors. `liquid-tabs`, `liquid-glass-app`, `auth-login-gallery`, `auth-registration` kiểm tra kéo/chạm/keyboard, lựa chọn form, API fixture và auth. API fixture không phải bằng chứng giao dịch hay phiên đăng nhập production hoàn tất.
