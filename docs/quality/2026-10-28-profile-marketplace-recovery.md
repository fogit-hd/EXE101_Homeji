# Hồ sơ, lỗi nghiệp vụ và mật độ Chợ Homeji — 28/10/2026

## Nguyên nhân và sửa lỗi

- Backend tạo ví khi chưa có UserProfile, có thể vi phạm khóa ngoại và trả lỗi 500. MoMo, PayOS và mua gói bằng ví nay kiểm tra hồ sơ trước khi ghi dữ liệu. Trả 403 với mã `profile_required` và hướng dẫn lưu Thông tin cơ bản.
- OnboardingCompleted được đặt khi cập nhật lối sống; không phải điều kiện thanh toán. Không thêm điều kiện bắt người dùng điền lối sống.
- Thông báo bổ sung hồ sơ có nút đi đúng tab, giữ đường dẫn quay lại trong Homeji; không tự gửi lại giao dịch. Lỗi lưu được giữ trên biểu mẫu. Lỗi tải hồ sơ có nút tải lại.
- Bộ xử lý lỗi chung phân biệt thiếu hồ sơ với hồ sơ chủ trọ bị từ chối, 404 với sự cố máy chủ, 429 với mất dịch vụ; số tiền chứa 500 không bị coi là lỗi kỹ thuật. Chi tiết lỗi 500 được che.
- Bỏ khối gợi ý món lặp lại đầu danh sách. Thẻ món ngang, ảnh nhỏ, khoảng cách gọn, tên và giá rõ. Chợ đồ giảm ảnh và khoảng cách; thẻ ngang trên điện thoại.
- Nút Trong giỏ thực tế bỏ món: đổi thành Bỏ khỏi giỏ. Bổ sung nút tải lại danh sách món.
- Đổi Giao đến đâu thành Tìm quán gần bạn vì luồng hiện tại nhận tại quán; không hiển thị thời gian chuẩn bị khi giỏ trống.
- Phát hiện trực tiếp ở 390px: hiệu ứng kính đổi nút giỏ hàng từ fixed thành relative, kéo dài và ép danh sách. Loại nút giỏ cùng các thao tác thẻ món khỏi hiệu ứng này.

## Kiểm tra

- 22 kiểm thử frontend đạt: xử lý lỗi, đường dẫn quay lại, menu người bán, lọc/sắp xếp, trạng thái đăng nhập, nhóm giao dịch ví.
- 15 kiểm thử backend đạt: thiếu hồ sơ trước tạo thanh toán, vòng đời thanh toán, xử lý ngoại lệ. Kịch bản tạo PayOS với hồ sơ chưa hoàn tất lối sống vẫn đạt.
- TypeScript/Vite build đạt; ESLint các module thay đổi đạt.
- Trình duyệt với API giả lập loopback: thiếu hồ sơ → nhập tên → lưu → quay lại đúng trang món; thêm món đổi thành Bỏ khỏi giỏ; món hết hàng không thể thêm.
- Kiểm tra trực quan desktop và 390px. Sau sửa nút giỏ có position fixed, danh sách dùng toàn chiều rộng, body không tràn ngang. Chợ đồ mobile cũng không tràn ngang.
- Ảnh local: output/ux-recovery-2026-10-28/marketplace-desktop.png và marketplace-mobile.png trong checkout gốc.

## Phạm vi bằng chứng

Kiểm thử trình duyệt dùng dữ liệu giả lập, không tạo thanh toán thật. Rà soát tập trung vào các luồng hồ sơ, lỗi dùng chung, ví/thanh toán, chợ đồ và đồ ăn; không khẳng định mọi nghiệp vụ của sản phẩm đã được kiểm thử toàn diện.
