# OTP đăng ký và lịch sử biên nhận

Frontend production: https://homeji.onrender.com. Backend: https://homeji-be.onrender.com.

`/verify-email` nhận OTP signup, có nút gửi lại và bộ đếm chờ 60 giây sau resend. Đăng ký từ trang hoặc modal chuyển tới trang này khi backend trả `confirmationMethod: "otp"`. Nếu backend vẫn dùng link, giao diện giữ thông báo xác nhận bằng link. Chỉ lưu email đang xác thực trong sessionStorage, không lưu mật khẩu hay mã OTP.

`/receipts` yêu cầu đăng nhập, hiển thị 20 biên nhận/trang với sự kiện, số tiền, mã, thời gian Việt Nam và trạng thái chuyển email. Nút vào lịch sử có trong ví. Biên nhận cũ không được gửi email hàng loạt. Email đã chuyển cho nhà cung cấp không được mô tả là đã vào inbox.

Chi tiết HTML lấy qua API có Authorization rồi hiển thị trong iframe sandbox rỗng, không cho chạy script. Nút tải tạo file HTML phía trình duyệt. Chủ sở hữu được kiểm tra ở backend, không dựa vào điều kiện giao diện.

Backend cần triển khai migration và các cờ tính năng kích hoạt OTP đăng ký cũng như gửi biên nhận giao dịch; bật OTP sau khi frontend mới đã live. Luồng quên mật khẩu tiếp tục chuyển về `/reset-password` trên domain mới.

## Kiểm chứng local

- `npm run build`: qua.
- ESLint các file API/OTP/biên nhận mới: qua. Hai lỗi lint có sẵn ở AuthModal/AuthContext không thuộc thay đổi này (set-state-in-effect và only-export-components).
- Browser với fixture local: nhập mã sai có thông báo lỗi; resend có đếm chờ; mã đúng tạo session và mở trang được bảo vệ; danh sách 23 biên nhận chia 20/3, trang cuối tắt nút tiếp; mở HTML có iframe sandbox.
- Fixture chỉ kiểm tra giao diện, không gửi email hoặc thực hiện giao dịch thật. Backend được kiểm tra riêng bằng PostgreSQL cô lập, webhook PayOS có chữ ký và contract Supabase thật.
- Browser automation không xác nhận được tệp tải xuống từ blob; không coi việc click nút tải là bằng chứng đã tải thành công. Nội dung HTML và payload file đính kèm được kiểm tra ở backend.
