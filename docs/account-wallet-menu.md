# Ví tiền trong menu tài khoản

Ngày 17/10/2026. Menu tài khoản của GlobalHeader, bao gồm khi đang ở `/?section=payments`, có hàng “Ví tiền” với số dư khả dụng từ `GET /api/wallet`. Bấm vào mở route ví hiện có `/?section=marketplace&market=wallet&wallet=deposit`; đây là ví dùng trong luồng mua hàng hiện có.

Mỗi lần mở menu tải lại số dư. Request chỉ chạy khi menu mở; kết quả của lần mở trước bị bỏ qua khi đóng hoặc đổi tài khoản. Response cần có số dư hữu hạn và đúng userId khi hồ sơ đã có. Loading và lỗi được hiển thị riêng; lỗi không trở thành 0 đồng. Người dùng có thể thử tải lại hoặc mở ví ngay cả khi chưa lấy được số dư.

Build và scoped ESLint của component mới đạt. Browser fixture kiểm tra 5 nhóm hành vi: tải theo nhu cầu/route, refresh và response đến muộn, lỗi và retry về số dư 0, sai chủ ví, mở tab ví và đóng menu. Menu nằm trong viewport 320px; đã xem ảnh 320px và desktop. Các kịch bản không có page error. Số dư 350.000 đồng trong ảnh là dữ liệu giả lập, không phải xác nhận số dư tài khoản production; không tạo đơn mua hay giao dịch tiền thật.

Kết quả: `output/verification/account-wallet/results.json`; ảnh: `menu-320.png`, `menu-desktop.png`. Phạm vi thay đổi chỉ là lối vào ví và hiển thị số dư; không bổ sung thanh toán gói thành viên bằng ví hoặc thay đổi API mua hàng.
