# Liquid Glass — đối chiếu ảnh người dùng, 02/11/2026

## Mẫu và tiêu chí

Nguồn chuẩn là sáu ảnh trong `C:\Users\duong.THANHDUY\Downloads\liquid glass`, không phải một ảnh kính bất kỳ trên mạng. Không đưa ảnh cá nhân này vào tài nguyên công khai của ứng dụng.

- `1792475131200…2719911d…jpg`: công tắc trong, mép nhô và phần xanh bị thắt qua thấu kính.
- `1792475131209…2b3f06ee…jpg`: chữ nền bị uốn qua ô tìm kiếm và nút tròn; chữ/icon của nút không bị uốn.
- `1792475131223…d6154bca…jpg`: thanh tìm kiếm trên ranh giới ảnh và văn bản.
- `1792475131234…8472ed25…jpg`: cùng thanh khi nền chuyển sang nội dung sáng.
- `1792475131242…8be9a666…jpg`: bảo toàn màu xanh/hồng/vàng khi nền đi qua kính.
- `1792475131250…ea78dd63…jpg`: uốn các dòng văn bản ở mép trên và dưới trong cảnh cuộn.

Bốn phép dựng đối chiếu trực tiếp gồm công tắc, chữ lớn, nhiều dòng và dải màu. Hai ảnh toàn màn hình còn lại cung cấp bối cảnh bố cục và thay đổi nền. Đây là kiểm tra hình học/vật liệu; không lấy toàn bộ ảnh iPhone làm ảnh nền giả cho nút Homeji.

## Nghiên cứu và lựa chọn

[Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) phân biệt vật liệu trong và vật liệu phủ màu. [Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) mô tả vật liệu động phản ứng với nội dung xung quanh. Trên web, [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) xác định hiệu ứng lấy các pixel phía sau, bị giới hạn bởi backdrop root.

Homeji dùng bộ lọc SVG trên backdrop để uốn nền DOM thật; phần chữ giữ ở lớp không lọc. Các đầu bo được ghép từ bản đồ pháp tuyến cùng kích thước vật lý, không kéo giãn toàn bộ texture khi nút dài ra. Tab giữ ba kênh lấy mẫu R/G/B cho tán sắc. Canvas WebGL hiện có chỉ bổ sung phản sáng, không được mô tả thành renderer quang học của Apple hay bộ chụp toàn bộ DOM.

## Nguyên nhân và thay đổi

1. Depth `.06` cùng trần khúc xạ 3px làm nền gần như phẳng. Kiểm tra trước sửa cho độ lệch vai kính `0,0px`. Khôi phục độ sâu theo chiều cao và hình học mép; tâm giữ ổn định.
2. Công tắc bị dựng như vòm phóng đại, làm mảng xanh phình thành khối. Thay bằng mép nhô quanh vùng lõm nông, dựng lại ba texture. Công tắc dùng thật có lớp track riêng để CSS kính chung không xóa màu bật/tắt.
3. Dark mode dùng lớp phản chiếu tối có alpha lớn, che màu nền. Đổi sang phản chiếu sáng nhẹ, không phủ lớp đen lên toàn mặt. Trước sửa, cảnh sáng trên mobile dark mode giảm luminance vùng đo xuống khoảng 120/255; phép đo này hiện vượt ngưỡng 170.
4. Màu chữ theo nền CSS đã biết thay vì chỉ theo theme. Nền sáng có chữ tối; nền tối có chữ sáng. Với ảnh chụp không biết nội dung, giữ trạng thái mixed, không suy đoán màu pixel ảnh. Ước lượng nền dùng cache trong từng lượt cập nhật; cập nhật lại khi theme/class đổi, không thêm vòng lặp đo/vẽ liên tục.
5. Rà toàn trang phát hiện chữ sáng trên ô vị trí nền trắng của Chợ đồ ăn và nhãn Cho thuê ở trang khách; chỉnh surface hoặc màu chữ theo nền. Các khu vực nội dung này vẫn nằm ngoài khúc xạ.

## Đối chiếu và kiểm tra

- `glass-reference-calibration.e2e.mjs`: vai kính `+7/-8px`, đầu bo cùng chiều cao sai số trung bình `0,024` mức màu; phần xanh công tắc IoU `0,940`, RGB MAE `10,405`; phân bố chữ nền sai khác `0,079`; màu xanh nền truyền qua `[148,200,237]`. Các con số chỉ mô tả vùng đo đã định nghĩa, không phải tuyên bố toàn ảnh giống 94%.
- Ảnh trước/sau cùng phép dựng: `output/verification/glass-reference-calibration/before-comparison.png`, `after-comparison.png`. Chi tiết các vùng đo ở `reference-agreement.json` và `geometry-result.json` cùng thư mục.
- `glass-reference-dark.e2e.mjs`: kiểm tra pixel nút, tìm kiếm, tab và thumb trên nền sáng, dải màu và nền đêm; 390/1180px; kiểm tra màu chữ, màu trạng thái xanh và off-state. Cố ý phủ đen để xác nhận phép đo bắt được đúng lỗi.
- `glass-reference-optics.e2e.mjs`: bỏ displacement phải thay pixel nền; phần nét chữ giữ nguyên; cố ý blur chữ phải bị phát hiện; nhấp, phím mũi tên và forced-colors qua.
- `glass-project-rollout.e2e.mjs`: nhập/xác thực/FormData, checkbox, radio, disabled, ngoại lệ động và picker native qua; không làm kính trên dòng nội dung.
- `wallet-glass-readability.e2e.mjs`: nút giao dịch tương phản ít nhất 4,5:1; nhãn không bị lọc; tab vẫn hoạt động trong light/dark, desktop/mobile.
- `glass-game.e2e.mjs`: WebGL không vẽ liên tục khi nghỉ; mất context vẫn điều hướng; mobile DPR3 và dark desktop qua. Đây là máy tính mô phỏng viewport, không phải phép đo GPU trên điện thoại vật lý.
- `glass-route-coverage.e2e.mjs`: 23 route render bằng API fixture cho mỗi theme; nội dung loại trừ, trường nhập và portal giữ đúng quy tắc. Không xem đây là xác nhận giao dịch thật.
- Frontend 471 kiểm tra qua; build production và ESLint các module thay đổi qua. `dark-project-readability.e2e.mjs` rà 73 view ở 1440/390px, không có vấn đề tương phản bị bộ kiểm tra phát hiện và không có runtime error sau khi sửa các mặt nền nêu trên. Đây là kiểm tra có giới hạn của bộ đo, không phải chứng nhận toàn bộ WCAG.

Phải xác nhận build, bundle live và kiểm tra trình duyệt sau deploy trước khi ghi nhận phát hành. Chromium/Edge là môi trường kiểm tra trực tiếp; không tuyên bố pixel-identical với renderer iOS hoặc đã kiểm tra Safari khi chưa có thiết bị đó.
