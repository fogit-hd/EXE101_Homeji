# Hệ kính Homeji theo sáu ảnh tham chiếu

## Đọc ảnh và giới hạn suy luận

Ảnh 1 nhấn mạnh vùng cong phóng đại/bẻ hình ở mép, lóe sáng hẹp và lõi còn nhìn xuyên. Ảnh 2 cho thấy viền sáng không đồng đều: mép trên-trái mạnh, giữa trong, mép dưới có phản sáng; bóng nằm sát mặt nền làm khối kính tách khỏi nền. Ảnh 3 có một khối chọn nổi cao hơn đường ray màu, không phải mỗi tab là một nút đục riêng. Ảnh 4–6 cho thấy thumb kính độc lập chạy trên màu trạng thái của switch. Từ ảnh tĩnh không suy ra chính xác chiết suất, độ dày vật lý hay diễn tiến animation; triển khai là mô phỏng quang học 2D, không phải ray tracing.

## Bẻ hình theo biên khối

Bản cũ kéo một normal map vuông lên mọi tỷ lệ, khiến nút dài giống thấu kính ellipse, biến dạng ngang tăng theo chiều rộng. Bản mới sinh sáu normal map cho capsule tỷ lệ 1/2/3/4/6/10. Mỗi điểm lấy tâm gần nhất trên trục giữa đoạn capsule, tính normal hướng ra biên; độ cong tăng theo lũy thừa 3.5 khi gần mép. Lõi gần trung tính để nền không bị nhão toàn bộ.

Với feDisplacementMap, độ dời là scale nhân giá trị kênh trừ 0.5. Khi dùng objectBoundingBox, trục X nhân chiều rộng và trục Y nhân chiều cao. Kênh R vì thế được chia theo tỷ lệ rộng/cao; blur X cũng được bù tương ứng. Điều này giữ độ sâu mép gần ổn định khi nút kéo dài. Bộ sinh bù kích thước và dùng điểm đầu-cuối thực để tránh giảm cường độ ở đầu capsule hẹp do lấy mẫu.

ResizeObserver chọn map gần nhất theo tỷ lệ thực, gồm khi resize viewport hoặc font đổi. Chỉ xử lý batch khi hình học đổi; không có animation JS mỗi frame hoặc canvas/WebGL riêng cho từng nút. Sáu PNG dùng chung khoảng 54 KB, không tải ảnh từ bên ngoài. Đây vẫn là lượng tử hóa sáu tỷ lệ, không phải map chính xác từng pixel kích thước tùy ý.

## Độ trong và chiều sâu

Nền nút thường có tint trắng khoảng 9%; phần phản sáng là lớp gradient riêng, không phủ trắng đục cả lõi. Mép trên có highlight hẹp, hai bên có phản sáng khác cường độ, mép dưới có caustic giả lập và bóng tiếp xúc nhỏ. Bóng rơi mềm hơn ở ngoài giúp phân biệt khối nâng lên với nét viền vẽ phẳng. Không dùng text-shadow để tạo cảm giác kính; icon và chữ không đi qua filter.

Một viền trắng đồng đều + blur mạnh thường thành kính mờ hoặc nút nhựa. Khúc xạ chỉ thấy rõ khi nền có chi tiết đi qua vùng nút; trên nền phẳng phải dựa vào phản sáng, bóng và silhouette. Không thêm họa tiết giả vào nút để làm như đang bẻ nền. Không tô tím/cyan theo ảnh minh họa; màu đường ray và state dùng palette Homeji. Lóe giao thoa màu như ảnh 1 được tiết chế, không thêm viền cầu vồng vào mọi control.

## Tab chọn và select

LiquidTabList giữ đúng một phần tử lens, đặt trước nhãn. Khi nghỉ, lens vừa với chiều cao tab/đường ray. Trong lúc nhấn/kéo hoặc nhịp click, lens nở 3,5% ngang và 20% dọc rồi thu về trong 220ms; nhãn không bị scale. Lens vẫn trượt theo vị trí/chiều rộng button trong 420ms khi chọn bằng click/bàn phím; khi kéo thì bám pointer trực tiếp. Các tab chưa chọn là nhãn trên ray, không phải nhiều capsule nổi cạnh nhau. Màu chữ tách biệt giữa selected/unselected. Track có khoảng đệm đủ để mép lens không bị clipping; các rail dài cuộn ngang và đưa mục đang chọn vào viewport mà không cuộn cả trang.

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
