# Tin nhắn đến tự cập nhật

## Lỗi và nguyên nhân

`node tests/chat-incoming.e2e.mjs` đã tái hiện lỗi trước khi sửa: chờ “New incoming message” quá 2.500 ms dù đã phát sự kiện notification của đúng tài khoản và đúng hội thoại. Backend đã gửi thông báo DirectMessage sau khi lưu tin; frontend có kết nối SignalR dùng chung nhưng MapMessagesPanel chỉ GET nội dung khi activeId đổi. refreshKey cũng chỉ tải hộp thư.

## Thay đổi

- Hook useIncomingConversationMessages nghe sự kiện từ kết nối thông báo hiện có; không mở thêm hub cho từng cửa sổ chat. Tin mới làm mới nội dung và hộp thư, giữ bản nháp.
- Tải bù khi hub kết nối lại, online, focus hoặc trở lại tab. Dự phòng mỗi 20 giây khi trang hiển thị; không GET/đánh dấu đọc nội dung ở tab ẩn hoặc hội thoại đã đóng.
- Gộp sự kiện gần nhau, chỉ một lượt GET nội dung đang chạy; nếu có sự kiện mới trong lúc tải thì chạy lại sau đó. Hủy listener/timer và bỏ phản hồi cũ khi đổi hội thoại/tài khoản.
- Gộp tin theo ID, cập nhật attachments từ server và giữ tin vừa gửi thành công nếu GET trước đó chưa có tin này. Không cập nhật state khi dữ liệu giữ nguyên, tránh cuộn lại vì lượt tải định kỳ.
- Làm mới hộp thư sau GET nội dung để đọc trạng thái chưa đọc mới nhất. Request version ngăn phản hồi hộp thư cũ ghi đè lượt mới; lỗi làm mới nền không xóa tin hoặc lỗi gửi đang hiển thị.

## Kiểm tra

- Playwright trên component thật, API/notification bridge giả lập: nhận tin đang mở, giữ draft, không lặp, bỏ sự kiện tài khoản khác, phục hồi kết nối/online, poll dự phòng, không đánh dấu đọc tab ẩn, và bỏ phản hồi đến muộn sau khi chuyển hội thoại. Qua.
- Frontend 450/450 unit/contract tests qua; build và ESLint các file sửa qua.
- Không gửi tin thử tới người dùng thật. Chứng cứ local: `output/verification/chat-incoming/incoming.png`.

## Phát hành

Đối chiếu bundle production sau khi push; kết quả được ghi trong `output/verification/chat-incoming/release.json`.
