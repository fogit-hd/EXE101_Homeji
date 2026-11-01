# Nhãn Premium và xác minh chủ nhà

- Tách thành một hàng thông tin người đăng trên cùng thẻ, trước ảnh và giá; Premium không còn đè lên ảnh. Dùng cùng bố cục trên thẻ danh sách, thẻ cạnh bản đồ và phòng đang chọn.
- Hai nhãn dạng viên bo tròn, cùng chiều cao 32px: Premium vàng nhạt và xác minh xanh. Chữ giữ một dòng; khi thiếu chỗ cả nhãn xuống hàng. Giữ các khung hình vòng xác minh được cung cấp và hiệu ứng Premium hiện có.
- Chỉ hiển thị theo hai cờ độc lập từ dữ liệu thực; Premium không cấp dấu xác minh. Tooltip vẫn phân biệt gói tài khoản và xác minh hồ sơ chủ nhà.
- CSS giới hạn trong hàng nhãn của thẻ, không đổi các badge tại hồ sơ hoặc tin nhắn.

453/453 unit/contract tests, build và ESLint các file sửa qua. Playwright kiểm tra bản đồ/danh sách/chia đôi, sáng/tối, 320/390/1440px; nhãn là hàng đầu tiên, không che ảnh, không bị cắt/tràn, không bẻ đôi chữ, không cấp nhầm xác minh. Kiểm tra vòng xác minh reduced-motion và hai chu kỳ hoạt ảnh vẫn qua. Dữ liệu/ảnh trong kiểm tra là fixture.

Ảnh: `output/verification/verified-owner-map/light-390-split-badges.png` và `dark-320-split-badges.png`. Chứng cứ production ghi tại `output/verification/verified-owner-map/release.json` sau khi đối chiếu asset.
